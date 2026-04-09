import { act, fireEvent, render, screen } from '@testing-library/react'
import { AdminContext, RecordContextProvider, testDataProvider } from 'react-admin'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PayButton, SIMULATION_DELAY_MS } from 'src/components/PayButton'
import type { PaymentRequest } from 'src/types'

const record: PaymentRequest = {
  amount: 99,
  created_at: new Date().toISOString(),
  currency: 'TRY',
  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  id: 'request-1',
  note: 'Dinner split',
  paid_at: null,
  recipient_email: 'recipient@example.com',
  recipient_id: 'recipient-1',
  recipient_phone: null,
  sender_id: 'sender-1',
  status: 'pending',
  updated_at: new Date().toISOString(),
}

const renderButton = (request: PaymentRequest, update = vi.fn()) =>
  render(
    <AdminContext
      authProvider={{
        checkAuth: async () => undefined,
        checkError: async () => undefined,
        getIdentity: async () => ({ id: 'recipient-1', fullName: 'Recipient User' }),
        getPermissions: async () => '',
        login: async () => undefined,
        logout: async () => undefined,
      }}
      dataProvider={testDataProvider({
        update,
      })}
    >
      <RecordContextProvider value={request}>
        <PayButton />
      </RecordContextProvider>
    </AdminContext>,
  )

describe('PayButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows loading feedback and updates the request after the simulation delay', async () => {
    const update = vi.fn().mockResolvedValue({
      data: {
        ...record,
        paid_at: new Date().toISOString(),
        status: 'paid',
      },
    })

    renderButton(record, update)

    fireEvent.click(screen.getByRole('button', { name: 'Pay' }))

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pay' })).toBeDisabled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SIMULATION_DELAY_MS)
    })

    expect(update).toHaveBeenCalledWith(
      'payment_requests',
      expect.objectContaining({
        data: expect.objectContaining({
          paid_at: expect.any(String),
          status: 'paid',
        }),
        id: record.id,
      }),
    )
  })

  it('does not render for non-pending requests', () => {
    renderButton({
      ...record,
      status: 'paid',
    })

    expect(screen.queryByRole('button', { name: 'Pay' })).not.toBeInTheDocument()
  })
})
