/**
 * Shared settings-panel chrome.
 *
 * Every mode's settings component used to repeat the same outer markup:
 *   <div className="printtool-X-settings">
 *     <div className="printtool-X-settings__section">
 *       <h3 className="printtool-X-settings__title">…</h3>
 *       <p className="printtool-X-settings__description">…</p>
 *       <div className="printtool-X-settings__info">…</div>
 *     </div>
 *   </div>
 *
 * With CSS for each prefix duplicated five times. These primitives collapse
 * that. Mode-specific controls (textareas, sliders, etc.) live as children.
 */

import React from 'react'

interface SettingsPanelProps {
  /** Top-level card-like wrapper. Optional `className` allows mode-specific extras. */
  className?: string
  children: React.ReactNode
}

/**
 * The card-like outer container for a settings panel. Use this once per
 * settings component; wrap `<SettingsSection>`s inside.
 */
export function SettingsPanel({ className, children }: SettingsPanelProps) {
  return (
    <div className={`printtool-settings-panel${className ? ` ${className}` : ''}`}>{children}</div>
  )
}

interface SettingsSectionProps {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}

/**
 * A titled section inside a SettingsPanel. Use multiple `<SettingsSection>`s
 * when a single panel groups distinct concerns (e.g. sticker's image-pool +
 * pipeline-settings groups).
 */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="printtool-settings-panel__section">
      <h3 className="printtool-settings-panel__title">{title}</h3>
      {description && <p className="printtool-settings-panel__description">{description}</p>}
      {children}
    </div>
  )
}

interface SettingsInfoProps {
  children: React.ReactNode
}

/**
 * Tinted footer-style note inside a section ("Requires X", "Note: …").
 */
export function SettingsInfo({ children }: SettingsInfoProps) {
  return <div className="printtool-settings-panel__info">{children}</div>
}
