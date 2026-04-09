import { Component, type ReactNode } from 'react'
import { Alert } from '@mui/material'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) {
      console.error(error)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error">
          Failed to load requests. Please refresh the page.
        </Alert>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
