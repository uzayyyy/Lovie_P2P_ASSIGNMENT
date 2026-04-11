import { useEffect, useState } from 'react'
import {
  DEMO_CURRENT_USER,
  DEMO_STORAGE_KEY,
  createSeedDemoRequests,
  normalizeDemoRequests,
} from 'src/services/demoPaymentRequests'
import { normalizeOptionalString } from 'src/services/paymentRequestHelpers'
import type { PaymentRequest } from 'src/types'

type DemoRequestInput = {
  amount: number
  note?: string
  recipient_email?: string
  recipient_phone?: string
}

const readDemoRequests = () => {
  if (typeof window === 'undefined') {
    return normalizeDemoRequests(createSeedDemoRequests())
  }

  const storedRequests = window.localStorage.getItem(DEMO_STORAGE_KEY)

  if (!storedRequests) {
    return normalizeDemoRequests(createSeedDemoRequests())
  }

  try {
    return normalizeDemoRequests(JSON.parse(storedRequests) as PaymentRequest[])
  } catch {
    return normalizeDemoRequests(createSeedDemoRequests())
  }
}

export const useDemoRequests = () => {
  const [requests, setRequests] = useState<PaymentRequest[]>(() => readDemoRequests())

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(requests))
  }, [requests])

  const createRequest = (input: DemoRequestInput) => {
    const timestamp = new Date().toISOString()
    const request: PaymentRequest = {
      amount: input.amount,
      created_at: timestamp,
      currency: 'TRY',
      expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      id: crypto.randomUUID(),
      note: normalizeOptionalString(input.note),
      paid_at: null,
      recipient_email: normalizeOptionalString(input.recipient_email),
      recipient_id: null,
      recipient_phone: normalizeOptionalString(input.recipient_phone),
      sender_email: DEMO_CURRENT_USER.email,
      sender_id: DEMO_CURRENT_USER.id,
      status: 'pending',
      updated_at: timestamp,
    }

    setRequests((currentRequests) => normalizeDemoRequests([request, ...currentRequests]))

    return request
  }

  const updateRequest = (
    requestId: string,
    updater: (request: PaymentRequest) => PaymentRequest,
  ) => {
    setRequests((currentRequests) =>
      normalizeDemoRequests(
        currentRequests.map((request) =>
          request.id === requestId ? updater(request) : request,
        ),
      ),
    )
  }

  const resetRequests = () => {
    setRequests(normalizeDemoRequests(createSeedDemoRequests()))
  }

  return {
    createRequest,
    requests,
    resetRequests,
    updateRequest,
  }
}
