import type { PaymentRequest, PublicPaymentRequest } from 'src/types'

export const DEMO_STORAGE_KEY = 'lovie-payment-request-demo-v1'

export const DEMO_CURRENT_USER = {
  email: 'alex@lovie.app',
  fullName: 'Alex Demo',
  id: 'demo-user',
  phone: '+905550000001',
}

const makeRelativeIso = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86_400_000).toISOString()

export const DEMO_PUBLIC_PREVIEW_REQUESTS: Record<string, PublicPaymentRequest> = {
  'demo-public-pending': {
    amount: 420.5,
    created_at: makeRelativeIso(-1),
    currency: 'TRY',
    expires_at: makeRelativeIso(6),
    id: 'demo-public-pending',
    note: 'Weekend house rental split',
    status: 'pending',
  },
  'demo-public-expired': {
    amount: 89.99,
    created_at: makeRelativeIso(-9),
    currency: 'TRY',
    expires_at: makeRelativeIso(-2),
    id: 'demo-public-expired',
    note: 'Late museum ticket reimbursement',
    status: 'expired',
  },
}

export const createSeedDemoRequests = (): PaymentRequest[] => [
  {
    amount: 480.25,
    created_at: makeRelativeIso(-1),
    currency: 'TRY',
    expires_at: makeRelativeIso(6),
    id: 'demo-outgoing-phone',
    note: 'Concert tickets for Friday night',
    paid_at: null,
    recipient_email: null,
    recipient_id: null,
    recipient_phone: '+905550000099',
    sender_email: DEMO_CURRENT_USER.email,
    sender_id: DEMO_CURRENT_USER.id,
    status: 'pending',
    updated_at: makeRelativeIso(-1),
  },
  {
    amount: 1250,
    created_at: makeRelativeIso(-3),
    currency: 'TRY',
    expires_at: makeRelativeIso(4),
    id: 'demo-outgoing-paid',
    note: 'Bodrum villa deposit',
    paid_at: makeRelativeIso(-2),
    recipient_email: 'selin@lovie.app',
    recipient_id: 'demo-friend-selin',
    recipient_phone: null,
    sender_email: DEMO_CURRENT_USER.email,
    sender_id: DEMO_CURRENT_USER.id,
    status: 'paid',
    updated_at: makeRelativeIso(-2),
  },
  {
    amount: 310,
    created_at: makeRelativeIso(-1),
    currency: 'TRY',
    expires_at: makeRelativeIso(5),
    id: 'demo-incoming-pending',
    note: 'Dinner split from Galataport',
    paid_at: null,
    recipient_email: DEMO_CURRENT_USER.email,
    recipient_id: DEMO_CURRENT_USER.id,
    recipient_phone: DEMO_CURRENT_USER.phone,
    sender_email: 'emir@lovie.app',
    sender_id: 'demo-friend-emir',
    status: 'pending',
    updated_at: makeRelativeIso(-1),
  },
  {
    amount: 96,
    created_at: makeRelativeIso(-5),
    currency: 'TRY',
    expires_at: makeRelativeIso(-1),
    id: 'demo-incoming-expired',
    note: 'Taxi back from airport',
    paid_at: null,
    recipient_email: DEMO_CURRENT_USER.email,
    recipient_id: DEMO_CURRENT_USER.id,
    recipient_phone: DEMO_CURRENT_USER.phone,
    sender_email: 'melis@lovie.app',
    sender_id: 'demo-friend-melis',
    status: 'pending',
    updated_at: makeRelativeIso(-5),
  },
]

export const normalizeDemoRequests = (requests: PaymentRequest[]) =>
  requests.map((request) => {
    if (
      request.status === 'pending'
      && new Date(request.expires_at).getTime() <= Date.now()
    ) {
      return {
        ...request,
        status: 'expired',
      } satisfies PaymentRequest
    }

    return request
  })
