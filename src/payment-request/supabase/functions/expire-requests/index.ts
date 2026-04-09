import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const now = new Date().toISOString()

  const { count, error } = await supabase
    .from('payment_requests')
    .update({
      status: 'expired',
      updated_at: now,
    })
    .eq('status', 'pending')
    .lt('expires_at', now)
    .select('id', { count: 'exact', head: true })

  return new Response(
    JSON.stringify({
      error: error?.message ?? null,
      expired: count ?? 0,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      status: error ? 500 : 200,
    },
  )
})
