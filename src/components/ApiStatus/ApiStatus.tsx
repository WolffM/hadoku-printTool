/**
 * ApiStatus Component
 * Displays the status of the backend API connection
 */

import React from 'react'

export type ApiStatusState = 'checking' | 'online' | 'offline'

interface ApiStatusProps {
  status: ApiStatusState
  onRetry?: () => void
}

export function ApiStatus({ status, onRetry }: ApiStatusProps) {
  return (
    <div className={`printtool-api-status printtool-api-status--${status}`}>
      <span className="printtool-api-status__indicator" />
      <span className="printtool-api-status__text">
        {status === 'checking' && 'Checking API...'}
        {status === 'online' && 'API Online'}
        {status === 'offline' && 'API Offline'}
      </span>
      {status === 'offline' && onRetry && (
        <button
          type="button"
          className="printtool-api-status__retry"
          onClick={onRetry}
          title="Retry connection"
        >
          Retry
        </button>
      )}
    </div>
  )
}
