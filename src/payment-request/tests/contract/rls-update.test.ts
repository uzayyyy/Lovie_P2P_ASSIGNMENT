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

describeIfSupabase('RLS update policies', () => {
  afterEach(async () => {
    await cleanupTrackedData()
  })

  it('allows the sender to set status to cancelled', async () => {
    ensureSupabaseEnv()
    const sender = await createTestUser('update-sender-cancel')
    const recipient = await createTestUser('update-recipient-cancel')
    const request = await createTestRequest({
      amount: 40,
      recipient_email: recipient.email,
      recipient_id: recipient.id,
      sender_id: sender.id,
    })

    const { data, error } = await sender.client
      .from('payment_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', request.id)
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(data.status).toBe('cancelled')
  })

  it('prevents the sender from setting status to paid', async () => {
    ensureSupabaseEnv()
    const sender = await createTestUser('update-sender-paid')
    const recipient = await createTestUser('update-recipient-paid')
    const request = await createTestRequest({
      amount: 40,
      recipient_email: recipient.email,
      recipient_id: recipient.id,
      sender_id: sender.id,
    })

    const { error } = await sender.client
      .from('payment_requests')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', request.id)

    expect(error).toBeTruthy()
  })

  it('allows the recipient to set status to paid or declined', async () => {
    ensureSupabaseEnv()
    const sender = await createTestUser('update-sender-terminal')
    const recipient = await createTestUser('update-recipient-terminal')
    const requestPaid = await createTestRequest({
      amount: 40,
      recipient_email: recipient.email,
      recipient_id: recipient.id,
      sender_id: sender.id,
    })
    const requestDeclined = await createTestRequest({
      amount: 50,
      recipient_email: recipient.email,
      recipient_id: recipient.id,
      sender_id: sender.id,
    })

    const paidResult = await recipient.client
      .from('payment_requests')
      .update({ paid_at: new Date().toISOString(), status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', requestPaid.id)
      .select('*')
      .single()

    const declinedResult = await recipient.client
      .from('payment_requests')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', requestDeclined.id)
      .select('*')
      .single()

    expect(paidResult.error).toBeNull()
    expect(paidResult.data.status).toBe('paid')
    expect(declinedResult.error).toBeNull()
    expect(declinedResult.data.status).toBe('declined')
  })

  it('prevents the recipient from cancelling or expiring a request', async () => {
    ensureSupabaseEnv()
    const sender = await createTestUser('update-sender-guard')
    const recipient = await createTestUser('update-recipient-guard')
    const request = await createTestRequest({
      amount: 40,
      recipient_email: recipient.email,
      recipient_id: recipient.id,
      sender_id: sender.id,
    })

    const cancelAttempt = await recipient.client
      .from('payment_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', request.id)

    const expireAttempt = await recipient.client
      .from('payment_requests')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', request.id)

    expect(cancelAttempt.error).toBeTruthy()
    expect(expireAttempt.error).toBeTruthy()
  })

  it('prevents anonymous updates', async () => {
    ensureSupabaseEnv()
    const sender = await createTestUser('update-sender-anon')
    const request = await createTestRequest({
      amount: 40,
      recipient_email: 'anon-update@example.com',
      sender_id: sender.id,
    })

    const anonClient = createAnonClient()
    const { error } = await anonClient
      .from('payment_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', request.id)

    expect(error).toBeTruthy()
  })
})
