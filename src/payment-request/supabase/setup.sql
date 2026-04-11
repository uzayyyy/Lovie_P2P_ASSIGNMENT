-- =============================================================================
-- Lovie Payment Request — Full Setup SQL
-- Run this once in the Supabase SQL Editor (dashboard → SQL Editor → New query)
-- =============================================================================

-- ── 1. profiles ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid        NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text        NOT NULL,
  phone        text        UNIQUE,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NULLIF(NEW.phone, '')
  )
  ON CONFLICT (id) DO UPDATE
  SET phone = COALESCE(public.profiles.phone, EXCLUDED.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- ── 2. payment_requests ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id              uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id       uuid           NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recipient_email text,
  recipient_phone text,
  recipient_id    uuid           REFERENCES auth.users(id) ON DELETE SET NULL,
  amount          numeric(12,2)  NOT NULL,
  currency        text           NOT NULL DEFAULT 'TRY',
  note            text,
  status          text           NOT NULL DEFAULT 'pending',
  created_at      timestamptz    NOT NULL DEFAULT now(),
  expires_at      timestamptz    NOT NULL DEFAULT now() + INTERVAL '7 days',
  paid_at         timestamptz,
  updated_at      timestamptz    NOT NULL DEFAULT now(),

  CONSTRAINT payment_requests_amount_positive CHECK (amount > 0),
  CONSTRAINT payment_requests_currency_v1     CHECK (currency = 'TRY'),
  CONSTRAINT payment_requests_note_length     CHECK (char_length(note) <= 280),
  CONSTRAINT payment_requests_recipient_contact_required CHECK (
    recipient_email IS NOT NULL OR recipient_phone IS NOT NULL
  ),
  CONSTRAINT payment_requests_status_valid    CHECK (
    status IN ('pending','paid','declined','cancelled','expired')
  )
);

CREATE INDEX IF NOT EXISTS idx_pr_sender_id       ON public.payment_requests (sender_id);
CREATE INDEX IF NOT EXISTS idx_pr_recipient_email ON public.payment_requests (recipient_email);
CREATE INDEX IF NOT EXISTS idx_pr_recipient_id    ON public.payment_requests (recipient_id);
CREATE INDEX IF NOT EXISTS idx_pr_status          ON public.payment_requests (status);
CREATE INDEX IF NOT EXISTS idx_pr_expires_at      ON public.payment_requests (expires_at);

ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS sender_email text;

ALTER TABLE public.payment_requests
  ALTER COLUMN recipient_email DROP NOT NULL;

ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_recipient_contact_required;

ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_recipient_contact_required
  CHECK (recipient_email IS NOT NULL OR recipient_phone IS NOT NULL);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS policies ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS profiles_select_own  ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own  ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own  ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS payment_requests_select_own ON public.payment_requests;
DROP POLICY IF EXISTS payment_requests_insert_own ON public.payment_requests;
DROP POLICY IF EXISTS payment_requests_update_own ON public.payment_requests;

CREATE POLICY payment_requests_select_own ON public.payment_requests FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY payment_requests_insert_own ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      (recipient_id IS NOT NULL AND sender_id IS DISTINCT FROM recipient_id)
      OR (
        recipient_id IS NULL
        AND (recipient_email IS NOT NULL OR recipient_phone IS NOT NULL)
        AND lower(COALESCE(recipient_email, '')) != lower(COALESCE((
          SELECT email FROM auth.users WHERE id = auth.uid()
        ), ''))
        AND COALESCE(recipient_phone, '') != COALESCE((
          SELECT phone FROM auth.users WHERE id = auth.uid()
        ), '')
      )
    )
  );

CREATE POLICY payment_requests_update_own ON public.payment_requests FOR UPDATE TO authenticated
  USING (
    status = 'pending'
    AND (auth.uid() = sender_id OR auth.uid() = recipient_id)
  )
  WITH CHECK (
    (auth.uid() = sender_id    AND status = 'cancelled')
    OR (auth.uid() = recipient_id AND status IN ('paid','declined'))
  );

-- ── 4. Public view for shareable links ────────────────────────────────────────
DROP VIEW IF EXISTS public.public_payment_request_view;

CREATE VIEW public.public_payment_request_view
  WITH (security_barrier = true, security_invoker = true)
AS
SELECT id, amount, currency, note, status, created_at, expires_at
FROM public.payment_requests;

GRANT  SELECT ON public.public_payment_request_view TO anon;
REVOKE ALL     ON public.payment_requests            FROM anon;

-- ── 5. Trigger: resolve recipient_id when a matching user signs up ────────────
CREATE OR REPLACE FUNCTION public.resolve_recipient_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.payment_requests
  SET recipient_id = NEW.id, updated_at = now()
  WHERE (
    (recipient_email IS NOT NULL AND lower(recipient_email) = lower(NEW.email))
    OR (
      recipient_phone IS NOT NULL
      AND NEW.phone IS NOT NULL
      AND recipient_phone = NEW.phone
    )
  )
    AND recipient_id IS NULL
    AND status = 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_user_resolve_recipient ON auth.users;
CREATE TRIGGER on_new_user_resolve_recipient
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.resolve_recipient_id();

-- Backfill sender_email for existing rows after the column is present.
UPDATE public.payment_requests pr
SET sender_email = u.email
FROM auth.users u
WHERE u.id = pr.sender_id
  AND pr.sender_email IS NULL;

UPDATE public.profiles profile
SET phone = NULLIF(user_record.phone, '')
FROM auth.users user_record
WHERE profile.id = user_record.id
  AND profile.phone IS DISTINCT FROM NULLIF(user_record.phone, '');

-- ── 6. pg_cron: hourly expiration (enable pg_cron extension in Dashboard first)
-- Dashboard → Database → Extensions → pg_cron → Enable
-- Then run:
--   SELECT cron.schedule('expire-payment-requests','0 * * * *',
--     $$ UPDATE public.payment_requests SET status='expired', updated_at=now()
--        WHERE status='pending' AND expires_at < now(); $$);

-- ── 7. Seed data for demo (optional — remove for production) ─────────────────
-- Seed is handled by scripts/seed-demo.sql (run separately after auth users exist)
