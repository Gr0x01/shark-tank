import Link from 'next/link'

interface InterstitialBandProps {
  title: string
  description: string
  ctaText: string
  ctaHref: string
  variant?: 'dark' | 'cyan' | 'gold' | 'coral' | 'cream'
  className?: string
  stat?: { label: string; value: string }
}

export function InterstitialBand({
  title,
  description,
  ctaText,
  ctaHref,
  variant = 'dark',
  className = '',
  stat
}: InterstitialBandProps) {
  return (
    <section className={`interstitial-band interstitial-band-${variant} ${className}`}>
      <div className="interstitial-inner">
        {/* Decorative background elements */}
        <div className="interstitial-deco interstitial-deco-1"></div>
        <div className="interstitial-deco interstitial-deco-2"></div>
        <div className="interstitial-deco interstitial-deco-3"></div>

        {/* Main content */}
        <div className="interstitial-content">
          {stat && (
            <div className="interstitial-stat">
              <span className="interstitial-stat-value">{stat.value}</span>
              <span className="interstitial-stat-label">{stat.label}</span>
            </div>
          )}

          <div className="interstitial-text">
            <h2 className="interstitial-title">{title}</h2>
            <p className="interstitial-description">{description}</p>
            <Link href={ctaHref} className="interstitial-btn">
              <span>{ctaText}</span>
              <svg className="interstitial-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
