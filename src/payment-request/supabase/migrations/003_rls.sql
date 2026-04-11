DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS payment_requests_select_own ON public.payment_requests;
CREATE POLICY payment_requests_select_own
ON public.payment_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id
  OR auth.uid() = recipient_id
);

DROP POLICY IF EXISTS payment_requests_insert_own ON public.payment_requests;
CREATE POLICY payment_requests_insert_own
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
    OR (
      recipient_id IS NULL
      AND (
        recipient_email IS NOT NULL
        OR recipient_phone IS NOT NULL
      )
      AND lower(COALESCE(recipient_email, '')) != lower(COALESCE((
        SELECT email
        FROM auth.users
        WHERE id = auth.uid()
      ), ''))
      AND COALESCE(recipient_phone, '') != COALESCE((
        SELECT phone
        FROM auth.users
        WHERE id = auth.uid()
      ), '')
    )
  )
);

DROP POLICY IF EXISTS payment_requests_update_own ON public.payment_requests;
CREATE POLICY payment_requests_update_own
ON public.payment_requests
FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
  )
)
WITH CHECK (
  (auth.uid() = sender_id AND status = 'cancelled')
  OR
  (auth.uid() = recipient_id AND status IN ('paid', 'declined'))
);
