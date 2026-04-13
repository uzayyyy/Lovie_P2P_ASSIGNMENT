import { afterEach, describe, expect, it } from 'vitest'
import {
  cleanupTrackedData,
  createAnonClient,
  createTestUser,
  ensureSupabaseEnv,
  hasSupabaseTestEnv,
} from '../helpers/supabase'

const describeIfSupabase = hasSupabaseTestEnv ? describe : describe.skip

describeIfSupabase('RLS insert policies', () => {
  afterEach(async () => {
    await cleanupTrackedData()
  })

  it('allows an authenticated user to insert with sender_id = auth.uid()', async () => {
    ensureSupabaseEnv()
    const userA = await createTestUser('insert-owner')

    const { data, error } = await userA.client
      .from('payment_requests')
      .insert({
        amount: 20,
        recipient_email: 'recipient@example.com',
        sender_id: userA.id,
      })
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(data.sender_id).toBe(userA.id)
  })

  it('rejects inserts when sender_id does not match auth.uid()', async () => {
    ensureSupabaseEnv()
    const userA = await createTestUser('insert-mismatch-a')
    const userB = await createTestUser('insert-mismatch-b')

    const { error } = await userA.client.from('payment_requests').insert({
      amount: 20,
      recipient_email: 'recipient@example.com',
      sender_id: userB.id,
    })

    expect(error).toBeTruthy()
  })

  it('blocks self-requests when recipient_email matches the sender email', async () => {
    ensureSupabaseEnv()
    const userA = await createTestUser('insert-self')

    const { error } = await userA.client.from('payment_requests').insert({
      amount: 20,
      recipient_email: userA.email,
      sender_id: userA.id,
    })

    expect(error).toBeTruthy()
  })

  it('prevents anonymous inserts', async () => {
    ensureSupabaseEnv()
    const anonClient = createAnonClient()

    const { error } = await anonClient.from('payment_requests').insert({
      amount: 20,
      recipient_email: 'recipient@example.com',
      sender_id: crypto.randomUUID(),
    })

    expect(error).toBeTruthy()
  })
})
