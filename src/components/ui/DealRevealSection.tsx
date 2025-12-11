'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSpoilerContext } from '@/contexts/SpoilerContext'

interface Shark {
  name: string
  slug: string
  photoUrl: string | null
}

interface DealRevealSectionProps {
  dealOutcome: 'deal' | 'no_deal' | 'deal_fell_through' | string | null
  dealAmount: number | null
  dealEquity: number | null
  askingAmount: number | null
  askingEquity: number | null
  sharks: Shark[]
}

function formatMoney(amount: number | null): string {
  if (!amount) return ''
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`
  return `$${amount.toLocaleString()}`
}

export function DealRevealSection({
  dealOutcome,
  dealAmount,
  dealEquity,
  askingAmount,
  askingEquity,
  sharks,
}: DealRevealSectionProps) {
  const { spoilersHidden } = useSpoilerContext()
  const [revealed, setRevealed] = useState(false)

  const showDealInfo = !spoilersHidden || revealed
  const gotDeal = dealOutcome === 'deal'
  const noDeal = dealOutcome === 'no_deal'
  const fellThrough = dealOutcome === 'deal_fell_through'

  return (
    <div className="deal-stats">
      {/* The Ask */}
      <div className="deal-stats-row">
        <span className="deal-stats-label">The Ask</span>
        <div className="deal-stats-value">
          {askingAmount ? (
            <>
              <span className="deal-stats-money">{formatMoney(askingAmount)}</span>
              {askingEquity && <span className="deal-stats-equity">for {askingEquity}%</span>}
            </>
          ) : (
            <span className="deal-stats-unknown">Unknown</span>
          )}
        </div>
      </div>

      {/* The Deal */}
      <div className="deal-stats-row">
        <span className="deal-stats-label">The Deal</span>

        {!showDealInfo ? (
          // Blurred placeholder - always shows fake deal layout
          <button
            className="deal-stats-spoiler"
            onClick={() => setRevealed(true)}
            aria-label="Reveal the deal outcome"
          >
            <div className="deal-stats-spoiler-content">
              <div className="deal-stats-sharks">
                <span className="deal-stats-shark-placeholder" />
                <span className="deal-stats-shark-placeholder" />
              </div>
              <span className="deal-stats-deal">
                <span className="deal-stats-money">$200K</span>
                <span className="deal-stats-equity">for 20%</span>
              </span>
            </div>
            <span className="deal-stats-spoiler-hint">Reveal</span>
          </button>
        ) : (
          // Actual content
          <div className="deal-stats-result">
            {gotDeal && (
              <>
                <div className="deal-stats-sharks">
                  {sharks.map((shark) => (
                    <Link
                      key={shark.slug}
                      href={`/sharks/${shark.slug}`}
                      className="deal-stats-shark"
                    >
                      {shark.photoUrl ? (
                        <Image
                          src={shark.photoUrl}
                          alt={shark.name}
                          width={40}
                          height={40}
                          className="deal-stats-shark-img"
                        />
                      ) : (
                        <span className="deal-stats-shark-fallback">
                          {shark.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
                <span className="deal-stats-deal">
                  <span className="deal-stats-money deal-stats-money-success">{formatMoney(dealAmount)}</span>
                  {dealEquity && <span className="deal-stats-equity">for {dealEquity}%</span>}
                </span>
              </>
            )}

            {noDeal && (
              <span className="deal-stats-nodeal">No Deal</span>
            )}

            {fellThrough && (
              <span className="deal-stats-fell">Deal Fell Through</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
