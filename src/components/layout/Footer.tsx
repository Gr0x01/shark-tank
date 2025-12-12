import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-[var(--ink-100)] bg-[var(--off-white)] py-16 mt-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div>
            <h3 className="font-display font-medium text-[var(--ink-900)] mb-4 text-sm">Browse</h3>
            <ul className="space-y-2.5 text-[var(--ink-500)]">
              <li><Link href="/products" scroll={false} className="hover:text-[var(--cyan-600)] transition-colors text-sm">All Products</Link></li>
              <li><Link href="/sharks" scroll={false} className="hover:text-[var(--cyan-600)] transition-colors text-sm">The Sharks</Link></li>
              <li><Link href="/seasons" scroll={false} className="hover:text-[var(--cyan-600)] transition-colors text-sm">By Season</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-display font-medium text-[var(--ink-900)] mb-4 text-sm">Discover</h3>
            <ul className="space-y-2.5 text-[var(--ink-500)]">
              <li><Link href="/still-in-business" scroll={false} className="hover:text-[var(--cyan-600)] transition-colors text-sm">Still in Business</Link></li>
              <li><Link href="/products?deal=deal" scroll={false} className="hover:text-[var(--cyan-600)] transition-colors text-sm">Got a Deal</Link></li>
              <li><Link href="/products?deal=no_deal" scroll={false} className="hover:text-[var(--cyan-600)] transition-colors text-sm">No Deal</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-medium text-[var(--ink-900)] mb-4 text-sm">Categories</h3>
            <ul className="space-y-2.5 text-[var(--ink-500)]">
              <li><Link href="/categories/food-beverage" scroll={false} className="hover:text-[var(--cyan-600)] transition-colors text-sm">Food & Beverage</Link></li>
              <li><Link href="/categories/technology" scroll={false} className="hover:text-[var(--cyan-600)] transition-colors text-sm">Technology</Link></li>
              <li><Link href="/categories/health-wellness" scroll={false} className="hover:text-[var(--cyan-600)] transition-colors text-sm">Health & Wellness</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-medium text-[var(--ink-900)] mb-4 text-sm">Company</h3>
            <ul className="space-y-2.5 text-[var(--ink-500)]">
              <li><Link href="/about" scroll={false} className="hover:text-[var(--cyan-600)] transition-colors text-sm">About</Link></li>
              <li><Link href="/privacy" scroll={false} className="hover:text-[var(--cyan-600)] transition-colors text-sm">Privacy Policy</Link></li>
              <li><Link href="/terms" scroll={false} className="hover:text-[var(--cyan-600)] transition-colors text-sm">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-[var(--ink-100)]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <span className="font-display font-medium text-[var(--ink-900)]">tankd.io</span>
            </div>
            <p className="text-sm text-[var(--ink-400)]">
              © {new Date().getFullYear()} Not affiliated with ABC or Sony Pictures Television.
            </p>
          </div>
          <div className="text-xs text-[var(--ink-400)] leading-relaxed max-w-4xl">
            <p>
              <strong className="font-medium text-[var(--ink-500)]">Affiliate Disclosure:</strong>{' '}
              We are a participant in the Amazon Services LLC Associates Program, an affiliate advertising program
              designed to provide a means for us to earn fees by linking to Amazon.com and affiliated sites.
              When you make a purchase through our links, we may earn a commission at no additional cost to you.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
