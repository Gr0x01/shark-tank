'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SharkImage } from './SharkImage'
import { Toggle } from './Toggle'
import type { Shark, SharkStats } from '@/lib/supabase/types'

interface SharkFilterProps {
  sharks: Shark[]
  stats: SharkStats[]
  maxDeals: number
  maxActive: number
  maxSuccess: number
  styleColors: Record<string, { bg: string; text: string }>
}

export function SharkFilter({ sharks, stats, maxDeals, maxActive, maxSuccess, styleColors }: SharkFilterProps) {
  const [showMainOnly, setShowMainOnly] = useState(false)

  const statsMap = new Map(stats.map(s => [s.slug, s]))

  // Filter sharks based on toggle
  const filteredSharks = showMainOnly
    ? sharks.filter(s => !s.is_guest_shark)
    : sharks

  return (
    <>
      {/* Filter toggle */}
      <div className="flex justify-between items-center mb-8">
        <p className="text-[var(--ink-500)]">
          Showing {filteredSharks.length} {showMainOnly ? 'main ' : ''}shark{filteredSharks.length !== 1 ? 's' : ''}
        </p>
        <Toggle
          checked={showMainOnly}
          onChange={setShowMainOnly}
          label="Main Sharks Only"
        />
      </div>

      {/* Shark Grid with fade animation */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSharks.map(shark => {
          const sharkStats = statsMap.get(shark.slug)

          return (
            <Link
              key={shark.id}
              href={`/sharks/${shark.slug}`}
              className="card group relative cursor-pointer hover:shadow-2xl hover:shadow-[var(--cyan-600)]/10 transition-all duration-300 animate-fadeIn overflow-visible"
            >
              {/* Investment Style Tag */}
              {shark.investment_style && (
                <div
                  className="absolute -top-1 -right-1 px-2.5 py-1 rounded-full font-display font-bold text-[10px] uppercase tracking-wider transform rotate-2 shadow-sm z-10 group-hover:rotate-6 group-hover:scale-105 transition-all duration-300"
                  style={{
                    backgroundColor: styleColors[shark.investment_style]?.bg || 'var(--ink-300)',
                    color: styleColors[shark.investment_style]?.text || 'var(--ink-900)'
                  }}
                >
                  {shark.investment_style}
                </div>
              )}

              <div className="flex items-center gap-4 mb-5">
                <div className="relative">
                  {/* Glow ring on hover */}
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 -m-1">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--cyan-600)] to-[var(--shark-blue)] opacity-20 blur-md animate-pulse" />
                  </div>

                  <div className="relative overflow-hidden rounded-full ring-2 ring-transparent group-hover:ring-[var(--shark-blue)] group-hover:ring-offset-2 group-hover:ring-offset-[var(--cream)] transition-all duration-500">
                    <SharkImage
                      src={shark.photo_url}
                      name={shark.name}
                      size="lg"
                      className="group-hover:scale-110 transition-transform duration-500 ease-out"
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-xl font-display font-semibold text-[var(--ink-900)] group-hover:text-[var(--cyan-600)] group-hover:-translate-y-0.5 transition-all duration-300">
                    {shark.name}
                  </h2>
                </div>
              </div>

              {sharkStats && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[var(--off-white)] rounded p-2.5">
                    <div className="font-display font-medium text-lg text-[var(--ink-900)]">{sharkStats.total_deals}</div>
                    <div className="text-[var(--ink-400)] text-xs font-display uppercase tracking-wide">Deals</div>
                    <div className="relative h-0.5 bg-[var(--ink-100)] mt-2 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-[var(--coral)] group-hover:shadow-[0_0_8px_rgba(255,107,107,0.6)] transition-all duration-[600ms] ease-out"
                        style={{ width: `${((sharkStats.total_deals || 0) / maxDeals) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-[var(--off-white)] rounded p-2.5">
                    <div className="font-display font-medium text-lg text-[var(--success)]">{sharkStats.active_companies}</div>
                    <div className="text-[var(--ink-400)] text-xs font-display uppercase tracking-wide">Active</div>
                    <div className="relative h-0.5 bg-[var(--ink-100)] mt-2 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-[var(--success)] group-hover:shadow-[0_0_8px_rgba(5,150,105,0.6)] transition-all duration-[600ms] ease-out delay-[100ms]"
                        style={{ width: `${((sharkStats.active_companies || 0) / maxActive) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-[var(--off-white)] rounded p-2.5">
                    <div className="font-display font-medium text-lg text-[var(--ink-900)]">
                      {sharkStats.success_rate ? `${sharkStats.success_rate}%` : '—'}
                    </div>
                    <div className="text-[var(--ink-400)] text-xs font-display uppercase tracking-wide">Success</div>
                    <div className="relative h-0.5 bg-[var(--ink-100)] mt-2 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-[var(--cyan-600)] group-hover:shadow-[0_0_8px_rgba(8,145,178,0.6)] transition-all duration-[600ms] ease-out delay-[200ms]"
                        style={{ width: `${((sharkStats.success_rate || 0) / maxSuccess) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {filteredSharks.length === 0 && (
        <div className="text-center py-16 text-[var(--ink-400)] card">
          <p className="font-display">No sharks found matching the filter.</p>
        </div>
      )}
    </>
  )
}
