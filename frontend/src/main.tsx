import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './utils/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // In production, this would be sent to an error tracking service
        console.error('Application error:', error, errorInfo)
      }}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
