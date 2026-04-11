ALTER TABLE public.payment_requests
  ALTER COLUMN recipient_email DROP NOT NULL;

ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_recipient_contact_required;

ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_recipient_contact_required
  CHECK (recipient_email IS NOT NULL OR recipient_phone IS NOT NULL);

UPDATE public.profiles profile
SET phone = NULLIF(user_record.phone, '')
FROM auth.users user_record
WHERE profile.id = user_record.id
  AND profile.phone IS DISTINCT FROM NULLIF(user_record.phone, '');
