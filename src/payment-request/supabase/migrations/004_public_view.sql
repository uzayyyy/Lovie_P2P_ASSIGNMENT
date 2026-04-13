DROP VIEW IF EXISTS public.public_payment_request_view;

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

GRANT SELECT ON public.public_payment_request_view TO anon;
REVOKE ALL ON public.payment_requests FROM anon;
