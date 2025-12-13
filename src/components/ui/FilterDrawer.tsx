'use client'

import { Fragment } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { useFilterParams } from '@/hooks/useFilterParams'
import { SeasonSelect } from './SeasonSelect'
import { SharkSelect } from './SharkSelect'
import type { Shark, Category } from '@/lib/supabase/types'

interface FilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  stats: {
    active: number
    outOfBusiness: number
    gotDeal: number
    noDeal: number
  }
  sharks: Shark[]
  categories: Category[]
  currentSeason: number
  hideSharkFilter?: boolean
  basePath?: string
}

export function FilterDrawer({
  isOpen,
  onClose,
  stats,
  sharks,
  categories,
  currentSeason,
  hideSharkFilter,
  basePath,
}: FilterDrawerProps) {
  const { toggleFilter, setFilter, isChecked, clearAll, getFilterValue, getFilterValues } = useFilterParams(basePath)

  const currentSeasonFilter = getFilterValue('season')
  const currentSharkFilter = getFilterValue('shark')

  // Count active filters (exclude shark filter if hidden)
  const activeCount =
    (currentSeasonFilter ? 1 : 0) +
    getFilterValues('status').length +
    getFilterValues('deal').length +
    (hideSharkFilter ? 0 : (currentSharkFilter ? 1 : 0)) +
    getFilterValues('category').length

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[var(--ink-900)]/40" />
        </TransitionChild>

        {/* Drawer */}
        <div className="fixed inset-0 flex items-end">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full"
          >
            <DialogPanel className="w-full max-h-[75vh] bg-[var(--warm-white)] rounded-t-2xl shadow-xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ink-200)]">
                <DialogTitle className="text-lg font-display font-semibold text-[var(--ink-900)]">
                  Filters
                </DialogTitle>
                <button
                  onClick={onClose}
                  aria-label="Close filters"
                  className="p-2 -mr-2 text-[var(--ink-500)] hover:text-[var(--ink-900)] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Filter Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                {/* Season */}
                <div>
                  <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Season</h3>
                  <SeasonSelect
                    value={currentSeasonFilter}
                    onChange={(value) => setFilter('season', value)}
                    currentSeason={currentSeason}
                  />
                </div>

                {/* Shark - Hidden on shark portfolio pages */}
                {!hideSharkFilter && (
                  <div>
                    <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Shark</h3>
                    <SharkSelect
                      sharks={sharks}
                      value={currentSharkFilter}
                      onChange={(value) => setFilter('shark', value)}
                    />
                  </div>
                )}

                {/* Status */}
                <div>
                  <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Status</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-[var(--ink-600)] cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                        checked={isChecked('status', 'active')}
                        onChange={() => toggleFilter('status', 'active')}
                      />
                      <span>Active ({stats.active})</span>
                    </label>
                    <label className="flex items-center gap-3 text-[var(--ink-600)] cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                        checked={isChecked('status', 'out_of_business')}
                        onChange={() => toggleFilter('status', 'out_of_business')}
                      />
                      <span>Out of Business ({stats.outOfBusiness})</span>
                    </label>
                  </div>
                </div>

                {/* Deal */}
                <div>
                  <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Deal</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-[var(--ink-600)] cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                        checked={isChecked('deal', 'deal')}
                        onChange={() => toggleFilter('deal', 'deal')}
                      />
                      <span>Got a Deal ({stats.gotDeal})</span>
                    </label>
                    <label className="flex items-center gap-3 text-[var(--ink-600)] cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                        checked={isChecked('deal', 'no_deal')}
                        onChange={() => toggleFilter('deal', 'no_deal')}
                      />
                      <span>No Deal ({stats.noDeal})</span>
                    </label>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <h3 className="font-display font-medium text-[var(--ink-900)] text-sm mb-3">Category</h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {categories.map(cat => (
                      <label key={cat.id} className="flex items-center gap-3 text-[var(--ink-600)] cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-[var(--ink-300)] text-[var(--coral)] focus:ring-[var(--coral)]"
                          checked={isChecked('category', cat.slug)}
                          onChange={() => toggleFilter('category', cat.slug)}
                        />
                        <span>{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--ink-200)] bg-white">
                <button
                  onClick={clearAll}
                  className="text-sm text-[var(--ink-600)] hover:text-[var(--ink-900)] transition-colors disabled:opacity-50"
                  disabled={activeCount === 0}
                >
                  Clear all
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[var(--coral)] text-white font-display font-medium text-sm rounded-lg hover:bg-[var(--coral-dark)] transition-colors"
                >
                  Show results
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
