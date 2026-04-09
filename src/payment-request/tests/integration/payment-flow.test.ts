import { afterEach, describe, expect, it } from 'vitest'
import { supabaseDataProvider } from 'ra-supabase-core'
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  cleanupTrackedData,
  createTestRequest,
  createTestUser,
  ensureSupabaseEnv,
  hasSupabaseTestEnv,
  makeFutureIso,
} from '../helpers/supabase'

const describeIfSupabase = hasSupabaseTestEnv ? describe : describe.skip

describeIfSupabase('payment request flow', () => {
  afterEach(async () => {
    await cleanupTrackedData()
  })

  it('marks a request as paid and blocks a second terminal update', async () => {
    ensureSupabaseEnv()
    const sender = await createTestUser('flow-sender')
    const recipient = await createTestUser('flow-recipient')
    const request = await createTestRequest({
      amount: 75,
      expires_at: makeFutureIso(2),
      recipient_email: recipient.email,
      recipient_id: recipient.id,
      sender_id: sender.id,
    })

    const dataProvider = supabaseDataProvider({
      apiKey: SUPABASE_ANON_KEY,
      instanceUrl: SUPABASE_URL,
      supabaseClient: recipient.client,
    })

    const timestamp = new Date().toISOString()

    const result = await dataProvider.update('payment_requests', {
      data: {
        paid_at: timestamp,
        status: 'paid',
        updated_at: timestamp,
      },
      id: request.id,
      previousData: request,
    })

    expect(result.data.status).toBe('paid')

    await expect(
      dataProvider.update('payment_requests', {
        data: {
          status: 'declined',
          updated_at: new Date().toISOString(),
        },
        id: request.id,
        previousData: result.data,
      }),
    ).rejects.toBeTruthy()
  })

  it('marks a request as declined', async () => {
    ensureSupabaseEnv()
    const sender = await createTestUser('flow-sender-decline')
    const recipient = await createTestUser('flow-recipient-decline')
    const request = await createTestRequest({
      amount: 42,
      recipient_email: recipient.email,
      recipient_id: recipient.id,
      sender_id: sender.id,
    })

    const dataProvider = supabaseDataProvider({
      apiKey: SUPABASE_ANON_KEY,
      instanceUrl: SUPABASE_URL,
      supabaseClient: recipient.client,
    })

    const result = await dataProvider.update('payment_requests', {
      data: {
        status: 'declined',
        updated_at: new Date().toISOString(),
      },
      id: request.id,
      previousData: request,
    })

    expect(result.data.status).toBe('declined')
  })
})
