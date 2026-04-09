import { afterEach, describe, expect, it } from 'vitest'
import {
  cleanupTrackedData,
  createAnonClient,
  createTestRequest,
  createTestUser,
  ensureSupabaseEnv,
  hasSupabaseTestEnv,
} from '../helpers/supabase'

const describeIfSupabase = hasSupabaseTestEnv ? describe : describe.skip

describeIfSupabase('public payment request view', () => {
  afterEach(async () => {
    await cleanupTrackedData()
  })

  it('returns only public-safe columns', async () => {
    ensureSupabaseEnv()
    const sender = await createTestUser('public-view-sender')
    const request = await createTestRequest({
      amount: 88,
      note: 'Shared dinner',
      recipient_email: 'public@example.com',
      sender_id: sender.id,
    })

    const anonClient = createAnonClient()
    const { data, error } = await anonClient
      .from('public_payment_request_view')
      .select('*')
      .eq('id', request.id)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).toMatchObject({
      amount: 88,
      currency: 'TRY',
      id: request.id,
      note: 'Shared dinner',
      status: 'pending',
    })
    expect(data).not.toHaveProperty('sender_id')
    expect(data).not.toHaveProperty('recipient_email')
    expect(data).not.toHaveProperty('recipient_phone')
    expect(data).not.toHaveProperty('recipient_id')
    expect(data).not.toHaveProperty('paid_at')
    expect(data).not.toHaveProperty('updated_at')
  })

  it('returns null for non-existent rows', async () => {
    ensureSupabaseEnv()
    const anonClient = createAnonClient()
    const { data, error } = await anonClient
      .from('public_payment_request_view')
      .select('*')
      .eq('id', crypto.randomUUID())
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeNull()
  })
})
