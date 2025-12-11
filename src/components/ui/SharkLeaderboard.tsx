import Link from 'next/link'
import type { LeaderboardShark } from '@/lib/supabase/types'
import { SharkImage } from './SharkImage'

interface SharkLeaderboardProps {
  mostDeals: LeaderboardShark | null
  highestSuccess: LeaderboardShark | null
  biggestInvestor: LeaderboardShark | null
}

export function SharkLeaderboard({ mostDeals, highestSuccess, biggestInvestor }: SharkLeaderboardProps) {
  const formatStat = (shark: LeaderboardShark) => {
    if (shark.stat_type === 'deals') {
      return `${shark.stat_value} deals`
    } else if (shark.stat_type === 'success_rate') {
      return `${shark.stat_value}% success`
    } else if (shark.stat_type === 'total_invested') {
      return `$${(shark.stat_value / 1000000).toFixed(1)}M invested`
    }
    return ''
  }

  const getIcon = (type: string) => {
    if (type === 'deals') return '👑'
    if (type === 'success_rate') return '🎯'
    if (type === 'total_invested') return '💰'
    return '⭐'
  }

  const getTitle = (type: string) => {
    if (type === 'deals') return 'Most Active'
    if (type === 'success_rate') return 'Highest Success Rate'
    if (type === 'total_invested') return 'Biggest Investor'
    return 'Top Shark'
  }

  const leaderboardItems = [
    { shark: mostDeals, title: 'Most Active', icon: '👑' },
    { shark: highestSuccess, title: 'Highest Success Rate', icon: '🎯' },
    { shark: biggestInvestor, title: 'Biggest Investor', icon: '💰' }
  ].filter(item => item.shark !== null)

  if (leaderboardItems.length === 0) {
    return null
  }

  return (
    <section className="mb-16">
      <h2 className="section-label mb-6">The Leaders</h2>
      <p className="text-sm text-[var(--ink-500)] mb-8">
        Top sharks by deals, success rate, and total investment
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {leaderboardItems.map(({ shark, title, icon }) => (
          shark && (
            <Link
              key={shark.id}
              href={`/sharks/${shark.slug}`}
              className="card group hover:border-[var(--cyan-600)] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl" aria-hidden="true">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-medium text-sm text-[var(--ink-500)] mb-2">
                    {title}
                  </h3>
                  <div className="flex items-center gap-3 mb-2">
                    <SharkImage
                      src={shark.photo_url}
                      name={shark.name}
                      size="sm"
                    />
                    <p className="font-display font-semibold text-[var(--ink-900)] group-hover:text-[var(--cyan-600)] transition-colors">
                      {shark.name}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--ink-600)]">
                    {formatStat(shark)}
                  </p>
                </div>
              </div>
            </Link>
          )
        ))}
      </div>
    </section>
  )
}
