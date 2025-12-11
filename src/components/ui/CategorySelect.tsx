'use client'

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import type { Category } from '@/lib/supabase/types'

interface CategorySelectProps {
  value: string
  onChange: (value: string) => void
  categories: Category[]
}

export function CategorySelect({ value, onChange, categories }: CategorySelectProps) {
  const options = [
    { value: '', label: 'All Categories' },
    ...categories.map(cat => ({ value: cat.slug, label: cat.name })),
  ]

  const selectedCategory = options.find(opt => opt.value === value) || options[0]

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <ListboxButton className="w-full flex items-center justify-between px-3 py-2 text-sm font-display bg-white border border-[var(--ink-200)] rounded-none text-[var(--ink-700)] hover:border-[var(--cyan-600)] focus:outline-none focus:ring-2 focus:ring-[var(--cyan-500)] focus:border-transparent transition-colors">
          <span>{selectedCategory.label}</span>
          <svg className="w-4 h-4 text-[var(--ink-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </ListboxButton>

        <ListboxOptions className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white border border-[var(--ink-200)] rounded-none shadow-lg focus:outline-none">
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="relative cursor-pointer select-none px-3 py-2 text-sm text-[var(--ink-600)] hover:bg-[var(--ink-100)] data-[selected]:text-[var(--coral)] data-[selected]:font-medium data-[focus]:bg-[var(--ink-100)]"
            >
              {({ selected }) => (
                <div className="flex items-center justify-between">
                  <span>{option.label}</span>
                  {selected && (
                    <svg className="w-4 h-4 text-[var(--coral)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
