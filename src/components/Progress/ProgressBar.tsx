/**
 * ProgressBar Component
 * Shows processing progress with step count and message
 */

import React from 'react'

interface ProgressBarProps {
  step: number
  total: number
  message: string
}

export function ProgressBar({ step, total, message }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((step / total) * 100) : 0

  return (
    <div className="printtool-progress">
      <div className="printtool-progress__header">
        <span className="printtool-progress__message">{message}</span>
        <span className="printtool-progress__count">
          {step} / {total}
        </span>
      </div>
      <div className="printtool-progress__bar">
        <div className="printtool-progress__fill" style={{ width: `${percentage}%` }} />
      </div>
      <div className="printtool-progress__percentage">{percentage}%</div>
    </div>
  )
}
