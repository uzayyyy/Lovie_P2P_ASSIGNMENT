import { Component, type ReactNode } from 'react'
import { Alert } from '@mui/material'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  errorMsg: string
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMsg: '',
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message ?? String(error) }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error">
          {this.state.errorMsg || 'Failed to load requests. Please refresh the page.'}
        </Alert>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
