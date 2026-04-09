import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { RESOURCE_PAYMENT_REQUESTS, type PaymentRequest } from 'src/types'

const trackedUserIds = new Set<string>()
const trackedRequestIds = new Set<string>()

export const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

const isPlaceholder = (value: string) =>
  value === 'your-anon-key'
  || value === 'your-service-role-key'
  || value === 'http://localhost:54321'
  || value.length === 0

export const hasSupabaseTestEnv = Boolean(
  SUPABASE_URL
  && SUPABASE_SERVICE_ROLE_KEY
  && SUPABASE_ANON_KEY
  && !isPlaceholder(SUPABASE_URL)
  && !isPlaceholder(SUPABASE_SERVICE_ROLE_KEY)
  && !isPlaceholder(SUPABASE_ANON_KEY),
)

export const createServiceClient = () =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

export const createAnonClient = () =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

const randomToken = () => `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`

export const createTestUser = async (label: string) => {
  const email = `${label}.${randomToken()}@example.com`
  return createTestUserWithEmail(email, label)
}

export const createTestUserWithEmail = async (email: string, label = 'test-user') => {
  const service = createServiceClient()
  const password = 'Password123!'

  const { data, error } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      full_name: label,
    },
  })

  if (error || !data.user) {
    throw error ?? new Error('Failed to create test user')
  }

  trackedUserIds.add(data.user.id)

  const client = createAnonClient()
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    throw signInError
  }

  return {
    client,
    email,
    id: data.user.id,
    password,
  }
}

export const createTestRequest = async (
  partial: Partial<PaymentRequest> & Pick<PaymentRequest, 'sender_id' | 'recipient_email' | 'amount'>,
) => {
  const service = createServiceClient()
  const payload = {
    amount: partial.amount,
    created_at: partial.created_at,
    currency: partial.currency ?? 'TRY',
    expires_at: partial.expires_at,
    note: partial.note ?? null,
    paid_at: partial.paid_at ?? null,
    recipient_email: partial.recipient_email,
    recipient_id: partial.recipient_id ?? null,
    recipient_phone: partial.recipient_phone ?? null,
    sender_id: partial.sender_id,
    status: partial.status ?? 'pending',
    updated_at: partial.updated_at,
  }

  const { data, error } = await service
    .from(RESOURCE_PAYMENT_REQUESTS)
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    throw error ?? new Error('Failed to create test request')
  }

  trackedRequestIds.add(data.id)

  return data as PaymentRequest
}

export const cleanupTrackedData = async () => {
  if (!hasSupabaseTestEnv) {
    return
  }

  const service = createServiceClient()

  if (trackedRequestIds.size > 0) {
    await service.from(RESOURCE_PAYMENT_REQUESTS).delete().in('id', [...trackedRequestIds])
    trackedRequestIds.clear()
  }

  for (const userId of trackedUserIds) {
    await service.auth.admin.deleteUser(userId)
  }

  trackedUserIds.clear()
}

export const makeFutureIso = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString()

export const makePastIso = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString()

export const ensureSupabaseEnv = () => {
  if (!hasSupabaseTestEnv) {
    throw new Error(
      'Supabase test environment is missing. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY.',
    )
  }
}

export type AuthenticatedTestUser = Awaited<ReturnType<typeof createTestUser>>
export type TestSupabaseClient = SupabaseClient
