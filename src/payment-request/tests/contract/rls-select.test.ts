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

describeIfSupabase('RLS select policies', () => {
  afterEach(async () => {
    await cleanupTrackedData()
  })

  it('user A cannot select user B requests', async () => {
    ensureSupabaseEnv()
    const userA = await createTestUser('sender-a')
    const userB = await createTestUser('sender-b')
    const request = await createTestRequest({
      amount: 50,
      recipient_email: 'third-party@example.com',
      sender_id: userA.id,
    })

    const { data, error } = await userB.client
      .from('payment_requests')
      .select('*')
      .eq('id', request.id)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('sender can select their own request', async () => {
    ensureSupabaseEnv()
    const userA = await createTestUser('sender-own')
    const request = await createTestRequest({
      amount: 50,
      recipient_email: 'recipient-own@example.com',
      sender_id: userA.id,
    })

    const { data, error } = await userA.client
      .from('payment_requests')
      .select('*')
      .eq('id', request.id)
      .single()

    expect(error).toBeNull()
    expect(data.id).toBe(request.id)
  })

  it('recipient can select a shared request', async () => {
    ensureSupabaseEnv()
    const userA = await createTestUser('sender-shared')
    const userB = await createTestUser('recipient-shared')
    const request = await createTestRequest({
      amount: 50,
      recipient_email: userB.email,
      recipient_id: userB.id,
      sender_id: userA.id,
    })

    const { data, error } = await userB.client
      .from('payment_requests')
      .select('*')
      .eq('id', request.id)
      .single()

    expect(error).toBeNull()
    expect(data.id).toBe(request.id)
  })

  it('anon cannot select from the payment_requests base table', async () => {
    ensureSupabaseEnv()
    const userA = await createTestUser('sender-anon')
    const request = await createTestRequest({
      amount: 50,
      recipient_email: 'anon-target@example.com',
      sender_id: userA.id,
    })

    const anonClient = createAnonClient()
    const { data, error } = await anonClient
      .from('payment_requests')
      .select('*')
      .eq('id', request.id)

    expect(error || data?.length === 0).toBeTruthy()
  })
})
