import Link from 'next/link'
import type { LeaderboardShark } from '@/lib/supabase/types'
import { SharkImage } from './SharkImage'

interface SharkLeaderboardProps {
  mostDeals: LeaderboardShark | null
  highestSuccess: LeaderboardShark | null
  biggestInvestor: LeaderboardShark | null
}

interface AchievementCardProps {
  shark: LeaderboardShark
  title: string
  description: string
  accentColor: string
  bgGradient: string
}

function AchievementCard({ shark, title, description, accentColor, bgGradient }: AchievementCardProps) {
  const formatStat = () => {
    if (shark.stat_type === 'deals') {
      return `${shark.stat_value} deals`
    } else if (shark.stat_type === 'success_rate') {
      return `${shark.stat_value}%`
    } else if (shark.stat_type === 'total_invested') {
      return `$${(shark.stat_value / 1000000).toFixed(1)}M`
    }
    return ''
  }

  const statLabel = () => {
    if (shark.stat_type === 'deals') {
      return 'Total Deals'
    } else if (shark.stat_type === 'success_rate') {
      return 'Success Rate'
    } else if (shark.stat_type === 'total_invested') {
      return 'Total Invested'
    }
    return ''
  }

  return (
    <Link
      href={`/sharks/${shark.slug}`}
      className="group relative overflow-hidden rounded-lg border border-[var(--ink-200)] hover:border-current transition-all hover:shadow-xl"
      style={{ borderColor: accentColor }}
    >
      {/* Gradient background */}
      <div
        className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity"
        style={{ background: bgGradient }}
      />

      <div className="relative p-6">
        {/* Category */}
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accentColor }}>
            {title}
          </h3>
          <p className="text-sm text-[var(--ink-500)]">
            {description}
          </p>
        </div>

        {/* Shark */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[var(--ink-100)]">
          <SharkImage
            src={shark.photo_url}
            name={shark.name}
            size="sm"
            className="group-hover:border-current transition-colors"
          />
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-lg text-[var(--ink-900)] group-hover:opacity-80 transition-opacity truncate">
              {shark.name}
            </p>
          </div>
        </div>

        {/* Stat */}
        <div className="flex items-baseline gap-2">
          <div className="font-display font-black text-3xl" style={{ color: accentColor }}>
            {formatStat()}
          </div>
          <div className="text-xs text-[var(--ink-500)] uppercase tracking-wide">
            {statLabel()}
          </div>
        </div>
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
      <div className="grid gap-6 md:grid-cols-3">
        {/* Most Active Investor */}
        {mostDeals && (
          <AchievementCard
            shark={mostDeals}
            title="Most Active"
            description="Highest number of total deals"
            accentColor="var(--coral)"
            bgGradient="linear-gradient(135deg, var(--coral) 0%, var(--coral-dark) 100%)"
          />
        )}

        {/* Highest Success Rate */}
        {highestSuccess && (
          <AchievementCard
            shark={highestSuccess}
            title="Best Success"
            description="Highest active company rate"
            accentColor="var(--gold)"
            bgGradient="linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)"
          />
        )}

        {/* Biggest Investor */}
        {biggestInvestor && (
          <AchievementCard
            shark={biggestInvestor}
            title="Biggest Investor"
            description="Highest total capital invested"
            accentColor="var(--shark-blue)"
            bgGradient="linear-gradient(135deg, var(--shark-blue) 0%, var(--shark-blue-dark) 100%)"
          />
        )}
      </div>
    </section>
  )
}
