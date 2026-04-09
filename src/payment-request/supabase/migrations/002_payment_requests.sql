CREATE TABLE IF NOT EXISTS public.payment_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recipient_email text NOT NULL,
  recipient_phone text,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'TRY',
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + INTERVAL '7 days',
  paid_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_requests_amount_positive CHECK (amount > 0),
  CONSTRAINT payment_requests_currency_v1 CHECK (currency = 'TRY'),
  CONSTRAINT payment_requests_note_length CHECK (char_length(note) <= 280),
  CONSTRAINT payment_requests_status_valid CHECK (
    status IN ('pending', 'paid', 'declined', 'cancelled', 'expired')
  )
);

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

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
