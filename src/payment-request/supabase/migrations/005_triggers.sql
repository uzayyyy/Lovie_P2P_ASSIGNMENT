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
    updated_at = now()
  WHERE
    recipient_email = NEW.email
    AND recipient_id IS NULL
    AND status = 'pending';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_user_resolve_recipient ON auth.users;

CREATE TRIGGER on_new_user_resolve_recipient
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.resolve_recipient_id();
