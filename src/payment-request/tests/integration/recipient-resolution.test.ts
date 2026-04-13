import { afterEach, describe, expect, it } from 'vitest'
import {
  cleanupTrackedData,
  createServiceClient,
  createTestRequest,
  createTestUser,
  createTestUserWithEmail,
  ensureSupabaseEnv,
  hasSupabaseTestEnv,
} from '../helpers/supabase'

const describeIfSupabase = hasSupabaseTestEnv ? describe : describe.skip

describeIfSupabase('recipient resolution trigger', () => {
  afterEach(async () => {
    await cleanupTrackedData()
  })

  it('resolves recipient_id when a new matching user signs up', async () => {
    ensureSupabaseEnv()
    const sender = await createTestUser('trigger-sender')
    const service = createServiceClient()
    const pendingEmail = `pending.${Date.now()}@example.com`

    const pendingRequest = await createTestRequest({
      amount: 10,
      recipient_email: pendingEmail,
      recipient_id: null,
      sender_id: sender.id,
      status: 'pending',
    })

    const recipient = await createTestUserWithEmail(pendingEmail, 'trigger-target')

    const { data: resolvedRow } = await service
      .from('payment_requests')
      .select('recipient_id')
      .eq('id', pendingRequest.id)
      .single()

    expect(resolvedRow?.recipient_id).toBe(recipient.id)
  })

  it('does not resolve recipient_id for non-pending rows', async () => {
    ensureSupabaseEnv()
    const sender = await createTestUser('trigger-sender-paid')
    const service = createServiceClient()
    const paidEmail = `paid.${Date.now()}@example.com`

    const paidRequest = await createTestRequest({
      amount: 10,
      recipient_email: paidEmail,
      recipient_id: null,
      sender_id: sender.id,
      status: 'paid',
    })

    await createTestUserWithEmail(paidEmail, 'trigger-target-paid')

    const { data: resolvedRow } = await service
      .from('payment_requests')
      .select('recipient_id')
      .eq('id', paidRequest.id)
      .single()

    expect(resolvedRow?.recipient_id).toBeNull()
  })
})
