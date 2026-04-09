import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ExpiryCountdown } from 'src/components/ExpiryCountdown'

const futureDate = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString()

const pastDate = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString()

describe('ExpiryCountdown', () => {
  it('renders a success chip for requests with more than 3 days remaining', () => {
    render(<ExpiryCountdown expiresAt={futureDate(4)} />)

    expect(screen.getByText('4 days remaining')).toBeInTheDocument()
  })

  it('renders a warning chip for requests with 1 to 3 days remaining', () => {
    render(<ExpiryCountdown expiresAt={futureDate(2)} />)

    expect(screen.getByText('2 days remaining')).toBeInTheDocument()
  })

  it('renders an error chip for requests with less than 1 day remaining', () => {
    render(<ExpiryCountdown expiresAt={futureDate(0.5)} />)

    expect(screen.getByText('< 1 day remaining')).toBeInTheDocument()
  })

  it('renders an expired chip for past requests', () => {
    render(<ExpiryCountdown expiresAt={pastDate(1)} />)

    expect(screen.getByText('Expired')).toBeInTheDocument()
  })
})
