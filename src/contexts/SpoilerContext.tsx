'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const COOKIE_NAME = 'spoilers-hidden'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

interface SpoilerContextType {
  spoilersHidden: boolean
  toggleSpoilers: () => void
}

const SpoilerContext = createContext<SpoilerContextType | undefined>(undefined)

export function SpoilerProvider({ children }: { children: ReactNode }) {
  const [spoilersHidden, setSpoilersHidden] = useState(true)

  useEffect(() => {
    const saved = getCookie(COOKIE_NAME)
    if (saved !== null) {
      setSpoilersHidden(saved === 'true')
    }
  }, [])

  const toggleSpoilers = () => {
    setSpoilersHidden((prev) => {
      const newValue = !prev
      setCookie(COOKIE_NAME, String(newValue), 365)
      return newValue
    })
  }

  return (
    <SpoilerContext.Provider value={{ spoilersHidden, toggleSpoilers }}>
      {children}
    </SpoilerContext.Provider>
  )
}

export function useSpoilerContext() {
  const context = useContext(SpoilerContext)
  if (context === undefined) {
    throw new Error('useSpoilerContext must be used within a SpoilerProvider')
  }
  return context
}
