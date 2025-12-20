import { Metadata } from 'next'
import { getSharks, getAllSharkStats, getLeaderboardSharks } from '@/lib/queries/cached'
import { SharkLeaderboard } from '@/components/ui/SharkLeaderboard'
import { SharkFilter } from '@/components/ui/SharkFilter'

// ISR: Revalidate every 24 hours (shark profiles rarely change)
export const revalidate = 86400

export const metadata: Metadata = {
  title: 'All Shark Tank Sharks - Every Investor & Their Deals | tankd.io',
  description: 'Meet all Shark Tank sharks and investors. Compare Mark Cuban, Lori Greiner, Kevin O\'Leary, Barbara Corcoran, and Daymond John\'s deals, success rates, and portfolios.',

  keywords: [
    'all Shark Tank sharks',
    'Shark Tank sharks',
    'Shark Tank investors',
    'who are the sharks on Shark Tank',
    'Mark Cuban deals',
    'Lori Greiner portfolio',
    'Kevin O\'Leary investments',
    'Barbara Corcoran Shark Tank',
    'Daymond John companies',
    'Shark Tank cast'
  ],

  openGraph: {
    title: 'All Shark Tank Sharks - Every Investor & Their Deals',
    description: 'Meet all Shark Tank sharks. Compare Mark Cuban, Lori Greiner, Kevin O\'Leary, and every investor\'s deals, success rates, and portfolios.',
    type: 'website',
    url: '/sharks',
    siteName: 'tankd.io',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'All Shark Tank Sharks - Every Investor',
    description: 'Meet all Shark Tank sharks and explore their investment portfolios, success rates, and active companies.',
  },

  alternates: {
    canonical: '/sharks',
  },
}

// Investment style color mapping
const styleColors: Record<string, { bg: string; text: string }> = {
  'Brand Builder': { bg: 'var(--coral)', text: 'white' },
  'Product Queen': { bg: 'var(--gold)', text: 'var(--ink-900)' },
  'Tech Investor': { bg: 'var(--cyan-600)', text: 'white' },
  'Fashion & Lifestyle': { bg: 'var(--coral-dark)', text: 'white' },
  'Deal Maker': { bg: 'var(--success)', text: 'white' },
  'Marketing Maven': { bg: 'var(--gold-light)', text: 'var(--ink-900)' },
  'Mr. Wonderful': { bg: 'var(--ink-800)', text: 'var(--gold)' },
  'Straight Shooter': { bg: 'var(--shark-blue)', text: 'white' },
  'People & Brands': { bg: 'var(--coral)', text: 'white' },
  'Fashion Icon': { bg: 'var(--ink-900)', text: 'white' },
  'Strategic Partner': { bg: 'var(--cyan-600)', text: 'white' },
  'Value Investor': { bg: 'var(--success)', text: 'white' },
  'Venture Capitalist': { bg: 'var(--shark-blue-dark)', text: 'white' },
}

export default async function SharksPage() {
  const [sharks, stats, leaderboard] = await Promise.all([
    getSharks(),
    getAllSharkStats(),
    getLeaderboardSharks(),
  ])

  // Calculate max values for progress bars
  const maxDeals = Math.max(...stats.map(s => s.total_deals || 0), 1)
  const maxActive = Math.max(...stats.map(s => s.active_companies || 0), 1)
  const maxSuccess = Math.max(...stats.map(s => s.success_rate || 0), 1)

  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <p className="section-label mb-2">The Investors</p>
          <h1 className="text-3xl md:text-4xl font-medium mb-2">All Shark Tank Sharks</h1>
          <p className="text-[var(--ink-500)]">
            Explore their portfolios, success rates, and investment styles
          </p>
        </div>

        {/* Leaderboard */}
        <SharkLeaderboard
          mostDeals={leaderboard.mostDeals}
          highestSuccess={leaderboard.highestSuccess}
          biggestInvestor={leaderboard.biggestInvestor}
        />

        <SharkFilter
          sharks={sharks}
          stats={stats}
          maxDeals={maxDeals}
          maxActive={maxActive}
          maxSuccess={maxSuccess}
          styleColors={styleColors}
        />
      </div>
    </main>
  )
}
