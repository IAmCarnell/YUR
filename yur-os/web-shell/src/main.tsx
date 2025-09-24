import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ErrorBoundary } from './utils/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // YUR OS spatial error logging
        console.error('YUR OS spatial error:', error, errorInfo)
      }}
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)