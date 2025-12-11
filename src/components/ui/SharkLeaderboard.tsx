import Link from 'next/link'
import type { LeaderboardShark } from '@/lib/supabase/types'
import { SharkImage } from './SharkImage'

interface SharkLeaderboardProps {
  mostDeals: LeaderboardShark | null
  highestSuccess: LeaderboardShark | null
  biggestInvestor: LeaderboardShark | null
}

interface PodiumCardProps {
  shark: LeaderboardShark
  title: string
  icon: string
  rank: 1 | 2 | 3
}

function PodiumCard({ shark, title, icon, rank }: PodiumCardProps) {
  const formatStat = () => {
    if (shark.stat_type === 'deals') {
      return `${shark.stat_value} deals`
    } else if (shark.stat_type === 'success_rate') {
      return `${shark.stat_value}% success`
    } else if (shark.stat_type === 'total_invested') {
      return `$${(shark.stat_value / 1000000).toFixed(1)}M invested`
    }
    return ''
  }

  // Styling based on rank
  const isChampion = rank === 1
  const imageSize = isChampion ? 'md' : 'sm'
  const borderColor = isChampion
    ? 'border-[var(--gold-light)]'
    : 'border-[var(--ink-200)]'
  const heightClass = isChampion
    ? 'md:min-h-[240px]'
    : 'md:min-h-[200px]'
  const shadowClass = isChampion
    ? 'shadow-lg'
    : 'shadow'

  return (
    <Link
      href={`/sharks/${shark.slug}`}
      className={`card group hover:border-[var(--cyan-600)] transition-all relative ${heightClass} ${borderColor} ${shadowClass} flex flex-col justify-between`}
    >
      {/* Rank badge */}
      <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm ${
        isChampion
          ? 'bg-[var(--gold)] text-white shadow-md'
          : 'bg-[var(--ink-300)] text-[var(--ink-900)]'
      }`}>
        #{rank}
      </div>

      <div>
        <div className="flex items-start gap-3 mb-4">
          <div className={isChampion ? 'text-4xl' : 'text-3xl'} aria-hidden="true">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-display font-medium text-[var(--ink-500)] mb-1 ${isChampion ? 'text-base' : 'text-sm'}`}>
              {title}
            </h3>
          </div>
        </div>

        <div className="flex flex-col items-center text-center mb-3">
          <div className="mb-3">
            <SharkImage
              src={shark.photo_url}
              name={shark.name}
              size={imageSize}
              className="group-hover:border-[var(--cyan-600)]"
            />
          </div>
          <p className={`font-display font-semibold text-[var(--ink-900)] group-hover:text-[var(--cyan-600)] transition-colors ${isChampion ? 'text-xl' : 'text-lg'}`}>
            {shark.name}
          </p>
        </div>
      </div>

      <div className="text-center pt-3 border-t border-[var(--ink-100)]">
        <p className={`font-display font-medium text-[var(--ink-700)] ${isChampion ? 'text-base' : 'text-sm'}`}>
          {formatStat()}
        </p>
      </div>
    </Link>
  )
}

export function SharkLeaderboard({ mostDeals, highestSuccess, biggestInvestor }: SharkLeaderboardProps) {
  if (!mostDeals && !highestSuccess && !biggestInvestor) {
    return null
  }

  return (
    <section className="mb-16">
      <h2 className="section-label mb-6">The Leaders</h2>
      <p className="text-sm text-[var(--ink-500)] mb-8">
        Top sharks by deals, success rate, and total investment
      </p>

      {/* Podium Layout - Desktop: Side cards flank champion, Mobile: Champion first */}
      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr_1fr] md:items-end">
        {/* #2 - Highest Success (Left on desktop, second on mobile) */}
        {highestSuccess && (
          <div className="order-2 md:order-1">
            <PodiumCard
              shark={highestSuccess}
              title="Highest Success Rate"
              icon="🎯"
              rank={2}
            />
          </div>
        )}

        {/* #1 - Most Deals (Center champion on desktop, first on mobile) */}
        {mostDeals && (
          <div className="order-1 md:order-2">
            <PodiumCard
              shark={mostDeals}
              title="Most Active"
              icon="👑"
              rank={1}
            />
          </div>
        )}

        {/* #3 - Biggest Investor (Right on desktop, third on mobile) */}
        {biggestInvestor && (
          <div className="order-3">
            <PodiumCard
              shark={biggestInvestor}
              title="Biggest Investor"
              icon="💰"
              rank={3}
            />
          </div>
        )}
      </div>
    </section>
  )
}
