import { afterEach, describe, expect, it } from 'vitest'
import {
  cleanupTrackedData,
  createServiceClient,
  createTestRequest,
  createTestUser,
  ensureSupabaseEnv,
  hasSupabaseTestEnv,
  makeFutureIso,
  makePastIso,
} from '../helpers/supabase'

const describeIfSupabase = hasSupabaseTestEnv ? describe : describe.skip

describeIfSupabase('expiry handling', () => {
  afterEach(async () => {
    await cleanupTrackedData()
  })

  it('expires only pending requests past expires_at', async () => {
    ensureSupabaseEnv()
    const sender = await createTestUser('expiry-sender')
    const expiredRequest = await createTestRequest({
      amount: 15,
      expires_at: makePastIso(1 / 24),
      recipient_email: 'expired@example.com',
      sender_id: sender.id,
    })
    const activeRequest = await createTestRequest({
      amount: 30,
      expires_at: makeFutureIso(1),
      recipient_email: 'active@example.com',
      sender_id: sender.id,
    })

    const service = createServiceClient()
    const now = new Date().toISOString()

    await service
      .from('payment_requests')
      .update({ status: 'expired', updated_at: now })
      .eq('status', 'pending')
      .lt('expires_at', now)

    const { data: expiredRow } = await service
      .from('payment_requests')
      .select('status')
      .eq('id', expiredRequest.id)
      .single()

    const { data: activeRow } = await service
      .from('payment_requests')
      .select('status')
      .eq('id', activeRequest.id)
      .single()

    expect(expiredRow?.status).toBe('expired')
    expect(activeRow?.status).toBe('pending')
  })
})
