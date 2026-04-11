-- Add sender_email to payment_requests for display without joins.
-- Populated at insert time from the authenticated user's email.
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS sender_email text;

-- Update the update_own RLS policy to also allow reading sender_email
-- (no change needed — column is NOT sensitive, SELECT policy already allows the row).

-- Backfill existing rows from auth.users (safe, runs once)
UPDATE public.payment_requests pr
SET sender_email = u.email
FROM auth.users u
WHERE u.id = pr.sender_id
  AND pr.sender_email IS NULL;
