-- BEFORE INSERT trigger that stamps sender_id and sender_email from
-- the authenticated user's JWT, so the client never needs to send them.
-- This lets the RLS INSERT policy verify auth.uid() = sender_id without
-- the client knowing its own UUID at form-submission time.

CREATE OR REPLACE FUNCTION public.set_payment_request_sender()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.sender_id    := auth.uid();
  NEW.sender_email := auth.jwt() ->> 'email';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_sender_on_insert ON public.payment_requests;

CREATE TRIGGER set_sender_on_insert
BEFORE INSERT ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_payment_request_sender();
