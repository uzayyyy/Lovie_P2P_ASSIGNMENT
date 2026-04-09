-- Integration test: run this SQL directly to simulate pg_cron without waiting for the schedule:
-- UPDATE public.payment_requests
-- SET status = 'expired', updated_at = now()
-- WHERE status = 'pending' AND expires_at < now();

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'expire-payment-requests',
  '0 * * * *',
  $$
    UPDATE public.payment_requests
    SET
      status = 'expired',
      updated_at = now()
    WHERE
      status = 'pending'
      AND expires_at < now();
  $$
)
WHERE NOT EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'expire-payment-requests'
);

-- Verification:
-- SELECT jobid, jobname, schedule FROM cron.job WHERE jobname = 'expire-payment-requests';
-- SELECT * FROM cron.job_run_details WHERE jobid IN (
--   SELECT jobid FROM cron.job WHERE jobname = 'expire-payment-requests'
-- );
