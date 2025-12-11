'use client'

import { useState, useMemo } from 'react'
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'
import type { Shark } from '@/lib/supabase/types'

interface SharkSelectProps {
  sharks: Shark[]
  value: string
  onChange: (value: string) => void
}

export function SharkSelect({ sharks, value, onChange }: SharkSelectProps) {
  const [query, setQuery] = useState('')

  // Split sharks into main and guest
  const { mainSharks, guestSharks } = useMemo(() => {
    const main = sharks.filter(s => !s.is_guest_shark)
    const guest = sharks.filter(s => s.is_guest_shark)
    return { mainSharks: main, guestSharks: guest }
  }, [sharks])

  // Filter based on query
  const filteredMain = useMemo(() => {
    if (!query) return mainSharks
    return mainSharks.filter(s =>
      s.name.toLowerCase().includes(query.toLowerCase())
    )
  }, [mainSharks, query])

  const filteredGuest = useMemo(() => {
    if (!query) return guestSharks
    return guestSharks.filter(s =>
      s.name.toLowerCase().includes(query.toLowerCase())
    )
  }, [guestSharks, query])

  const selectedShark = sharks.find(s => s.slug === value)
  const hasResults = filteredMain.length > 0 || filteredGuest.length > 0

  return (
    <Combobox value={value} onChange={(val: string | null) => onChange(val ?? '')} immediate>
      <div className="relative">
        <ComboboxInput
          className="w-full px-3 py-2 text-sm font-display bg-white border border-[var(--ink-200)] rounded-none text-[var(--ink-700)] placeholder:text-[var(--ink-400)] hover:border-[var(--cyan-600)] focus:outline-none focus:ring-2 focus:ring-[var(--cyan-500)] focus:border-transparent transition-colors"
          placeholder="Search sharks..."
          displayValue={() => selectedShark?.name || ''}
          onChange={(e) => setQuery(e.target.value)}
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--ink-400)] hover:text-[var(--ink-600)]"
            aria-label="Clear shark filter"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <ComboboxOptions className="absolute z-50 w-full mt-1 max-h-64 overflow-auto bg-white border border-[var(--ink-200)] rounded-none shadow-lg focus:outline-none">
          {!hasResults && query && (
            <div className="px-3 py-2 text-sm text-[var(--ink-400)]">
              No sharks found
            </div>
          )}

          {/* All Sharks option */}
          <ComboboxOption
            value=""
            className="relative cursor-pointer select-none px-3 py-2 text-sm text-[var(--ink-600)] hover:bg-[var(--ink-100)] data-[selected]:text-[var(--coral)] data-[selected]:font-medium data-[focus]:bg-[var(--ink-100)]"
          >
            {({ selected }) => (
              <div className="flex items-center justify-between">
                <span>All Sharks</span>
                {selected && (
                  <svg className="w-4 h-4 text-[var(--coral)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            )}
          </ComboboxOption>

          {/* Main Sharks */}
          {filteredMain.length > 0 && (
            <>
              {filteredMain.map((shark) => (
                <ComboboxOption
                  key={shark.id}
                  value={shark.slug}
                  className="relative cursor-pointer select-none px-3 py-2 text-sm text-[var(--ink-600)] hover:bg-[var(--ink-100)] data-[selected]:text-[var(--coral)] data-[selected]:font-medium data-[focus]:bg-[var(--ink-100)]"
                >
                  {({ selected }) => (
                    <div className="flex items-center justify-between">
                      <span>{shark.name}</span>
                      {selected && (
                        <svg className="w-4 h-4 text-[var(--coral)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  )}
                </ComboboxOption>
              ))}
            </>
          )}

          {/* Divider between main and guest sharks */}
          {filteredMain.length > 0 && filteredGuest.length > 0 && (
            <div className="border-t border-[var(--ink-200)] my-1">
              <div className="px-3 py-1.5 text-xs font-display text-[var(--ink-400)] uppercase tracking-wide">
                Guest Sharks
              </div>
            </div>
          )}

          {/* Guest Sharks */}
          {filteredGuest.length > 0 && (
            <>
              {filteredGuest.map((shark) => (
                <ComboboxOption
                  key={shark.id}
                  value={shark.slug}
                  className="relative cursor-pointer select-none px-3 py-2 text-sm text-[var(--ink-600)] hover:bg-[var(--ink-100)] data-[selected]:text-[var(--coral)] data-[selected]:font-medium data-[focus]:bg-[var(--ink-100)]"
                >
                  {({ selected }) => (
                    <div className="flex items-center justify-between">
                      <span>{shark.name}</span>
                      {selected && (
                        <svg className="w-4 h-4 text-[var(--coral)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  )}
                </ComboboxOption>
              ))}
            </>
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  )
}
