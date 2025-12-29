import React, { useRef, useState } from 'react'
import { ConnectedThemePicker, LoadingSkeleton } from '@wolffm/task-ui-components'
import { THEME_ICON_MAP } from '@wolffm/themes'
import { useTheme } from './hooks/useTheme'
import type { PrintToolProps } from './entry'

export default function App(props: PrintToolProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect system preference for loading skeleton
  const [systemPrefersDark] = useState(() => {
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  const { theme, setTheme, isDarkTheme, isThemeReady, isInitialThemeLoad, THEME_FAMILIES } =
    useTheme({
      propsTheme: props.theme,
      experimentalThemes: false, // Set to true to enable experimental themes
      containerRef
    })

  // Show loading skeleton during initial theme load to prevent FOUC
  if (isInitialThemeLoad && !isThemeReady) {
    return <LoadingSkeleton isDarkTheme={systemPrefersDark} />
  }

  return (
    <div
      ref={containerRef}
      className="printtool-container"
      data-theme={theme}
      data-dark-theme={isDarkTheme ? 'true' : 'false'}
    >
      <div className="printtool">
        <header className="printtool__header">
          <h1>Print Tool</h1>

          {/* Theme Picker */}
          <ConnectedThemePicker
            themeFamilies={THEME_FAMILIES}
            currentTheme={theme}
            onThemeChange={setTheme}
            getThemeIcon={(themeName: string) => {
              const Icon = THEME_ICON_MAP[themeName as keyof typeof THEME_ICON_MAP]
              return Icon ? <Icon /> : null
            }}
          />
        </header>

        <main className="printtool__content">
          <p>Current Theme: {theme}</p>
          <p>Dark Mode: {isDarkTheme ? 'Yes' : 'No'}</p>
        </main>
      </div>
    </div>
  )
}
