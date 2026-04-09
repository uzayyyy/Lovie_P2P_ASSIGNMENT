export const PaymentRequestStatusValues = [
  'pending',
  'paid',
  'declined',
  'cancelled',
  'expired',
] as const

export type PaymentRequestStatus = (typeof PaymentRequestStatusValues)[number]

export interface Profile {
  id: string
  display_name: string
  phone: string | null
  avatar_url: string | null
  created_at: string
}

export interface PaymentRequest {
  id: string
  sender_id: string
  recipient_email: string
  recipient_phone: string | null
  recipient_id: string | null
  amount: number
  currency: 'TRY'
  note: string | null
  status: PaymentRequestStatus
  created_at: string
  expires_at: string
  paid_at: string | null
  updated_at: string
}

export interface PublicPaymentRequest {
  id: string
  amount: number
  currency: 'TRY'
  note: string | null
  status: PaymentRequestStatus
  created_at: string
  expires_at: string
}

export interface PaymentRequestCreateInput {
  recipient_email: string
  recipient_phone?: string
  amount: number
  note?: string
}

export interface OutgoingRequestFilter {
  sender_id: string
  status?: PaymentRequestStatus
  'recipient_email@ilike'?: string
}

export interface IncomingRequestFilter {
  recipient_id: string
  status?: PaymentRequestStatus
  'sender_id@ilike'?: string
}

export const RESOURCE_PAYMENT_REQUESTS = 'payment_requests' as const
export const RESOURCE_PROFILES = 'profiles' as const
export const RESOURCE_PUBLIC_VIEW = 'public_payment_request_view' as const

export type ResourceName =
  | typeof RESOURCE_PAYMENT_REQUESTS
  | typeof RESOURCE_PROFILES
  | typeof RESOURCE_PUBLIC_VIEW
