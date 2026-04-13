-- =============================================================================
-- P2P Payment Request — Production Schema
-- Feature: 001-payment-request
-- Date: 2026-04-09
-- PostgreSQL 15 / Supabase
--
-- Apply via: supabase db push  OR  run each migration file individually.
-- Migration files in supabase/migrations/ split this into 6 numbered files;
-- this file is the single combined contract reference.
-- =============================================================================


-- =============================================================================
-- EXTENSIONS
-- =============================================================================

-- Required for pg_cron scheduling (enable in Supabase Dashboard → Extensions
-- OR run this once as superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- =============================================================================
-- TABLE: profiles
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid        NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text        NOT NULL,
  phone        text        UNIQUE,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();


-- =============================================================================
-- TABLE: payment_requests
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_requests (
  id              uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id       uuid           NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recipient_email text           NOT NULL,
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

  CONSTRAINT payment_requests_amount_positive    CHECK (amount > 0),
  CONSTRAINT payment_requests_currency_v1        CHECK (currency = 'TRY'),
  CONSTRAINT payment_requests_note_length        CHECK (char_length(note) <= 280),
  CONSTRAINT payment_requests_status_valid       CHECK (
    status IN ('pending', 'paid', 'declined', 'cancelled', 'expired')
  )
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_payment_requests_sender_id
  ON public.payment_requests (sender_id);

CREATE INDEX IF NOT EXISTS idx_payment_requests_recipient_email
  ON public.payment_requests (recipient_email);

CREATE INDEX IF NOT EXISTS idx_payment_requests_recipient_id
  ON public.payment_requests (recipient_id);

CREATE INDEX IF NOT EXISTS idx_payment_requests_status
  ON public.payment_requests (status);

CREATE INDEX IF NOT EXISTS idx_payment_requests_expires_at
  ON public.payment_requests (expires_at);

-- Enable RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- RLS POLICIES: profiles
-- =============================================================================

-- SELECT: authenticated users can read their own profile
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- INSERT: authenticated users can insert their own profile
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: authenticated users can update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- =============================================================================
-- RLS POLICIES: payment_requests
-- =============================================================================

-- SELECT: sender or recipient can read the shared row
CREATE POLICY "payment_requests_select_own"
ON public.payment_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id
  OR auth.uid() = recipient_id
);

-- INSERT: only the authenticated user as sender; self-requests blocked
CREATE POLICY "payment_requests_insert_own"
ON public.payment_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (
    (
      recipient_id IS NOT NULL
      AND sender_id IS DISTINCT FROM recipient_id
    )
    OR
    (
      recipient_id IS NULL
      AND recipient_email != (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  )
);

-- UPDATE: role-based status transitions only
--   Sender   → may set status = 'cancelled'
--   Recipient → may set status = 'paid' or 'declined'
--   System (pg_cron, service_role) → sets 'expired' (bypasses RLS)
CREATE POLICY "payment_requests_update_own"
ON public.payment_requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() = sender_id
  OR auth.uid() = recipient_id
)
WITH CHECK (
  (auth.uid() = sender_id     AND status = 'cancelled')
  OR
  (auth.uid() = recipient_id  AND status IN ('paid', 'declined'))
);

-- No DELETE policy — rows are append-only / immutable after creation


-- =============================================================================
-- VIEW: public_payment_request_view
-- Exposes safe columns only to anonymous callers for shareable links.
-- security_barrier prevents function inlining that could leak filtered rows.
-- security_invoker means the view runs with the caller's (anon) privileges,
-- so the base table RLS still applies for authenticated callers who use the
-- view directly.
-- =============================================================================

CREATE VIEW public.public_payment_request_view
  WITH (security_barrier = true, security_invoker = true)
AS
SELECT
  id,
  amount,
  currency,
  note,
  status,
  created_at,
  expires_at
FROM public.payment_requests;

-- Grant anonymous read on the view only
GRANT SELECT ON public.public_payment_request_view TO anon;

-- Revoke any accidental anon access to the base table
-- (No anon SELECT policy exists on payment_requests, so this is implicit,
--  but explicit revoke is belt-and-suspenders)
REVOKE ALL ON public.payment_requests FROM anon;


-- =============================================================================
-- TRIGGER: resolve_recipient_id
-- When a new user signs up whose email matches an existing pending request,
-- auto-populate recipient_id so the standard SELECT RLS policy applies.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resolve_recipient_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.payment_requests
  SET
    recipient_id = NEW.id,
    updated_at   = now()
  WHERE
    recipient_email = NEW.email
    AND recipient_id IS NULL
    AND status       = 'pending';

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_user_resolve_recipient
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.resolve_recipient_id();


-- =============================================================================
-- pg_cron: expire-payment-requests
-- Runs every hour. Updates pending requests past their expires_at to 'expired'.
-- Runs as postgres superuser → bypasses RLS (correct for system transitions).
-- =============================================================================

SELECT cron.schedule(
  'expire-payment-requests',
  '0 * * * *',
  $$
    UPDATE public.payment_requests
    SET
      status     = 'expired',
      updated_at = now()
    WHERE
      status     = 'pending'
      AND expires_at < now();
  $$
);
