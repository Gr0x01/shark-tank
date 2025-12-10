import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-[var(--ink-100)] bg-[var(--off-white)] py-16 mt-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div>
            <h3 className="font-display font-medium text-[var(--ink-900)] mb-4 text-sm">Browse</h3>
            <ul className="space-y-2.5 text-[var(--ink-500)]">
              <li><Link href="/products" className="hover:text-[var(--cyan-600)] transition-colors text-sm">All Products</Link></li>
              <li><Link href="/sharks" className="hover:text-[var(--cyan-600)] transition-colors text-sm">The Sharks</Link></li>
              <li><Link href="/seasons" className="hover:text-[var(--cyan-600)] transition-colors text-sm">By Season</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-display font-medium text-[var(--ink-900)] mb-4 text-sm">Discover</h3>
            <ul className="space-y-2.5 text-[var(--ink-500)]">
              <li><Link href="/products?status=active" className="hover:text-[var(--cyan-600)] transition-colors text-sm">Still in Business</Link></li>
              <li><Link href="/products?deal=deal" className="hover:text-[var(--cyan-600)] transition-colors text-sm">Got a Deal</Link></li>
              <li><Link href="/products?deal=no_deal" className="hover:text-[var(--cyan-600)] transition-colors text-sm">No Deal</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-medium text-[var(--ink-900)] mb-4 text-sm">Categories</h3>
            <ul className="space-y-2.5 text-[var(--ink-500)]">
              <li><Link href="/categories/food-beverage" className="hover:text-[var(--cyan-600)] transition-colors text-sm">Food & Beverage</Link></li>
              <li><Link href="/categories/technology" className="hover:text-[var(--cyan-600)] transition-colors text-sm">Technology</Link></li>
              <li><Link href="/categories/health-wellness" className="hover:text-[var(--cyan-600)] transition-colors text-sm">Health & Wellness</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-medium text-[var(--ink-900)] mb-4 text-sm">About</h3>
            <p className="text-[var(--ink-500)] text-sm leading-relaxed">
              The most comprehensive directory of Shark Tank products with real-time business status tracking.
            </p>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-[var(--ink-100)] flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-medium text-[var(--ink-900)]">SharkTank</span>
            <span className="text-[var(--cyan-600)] font-display text-sm">Directory</span>
          </div>
          <p className="text-sm text-[var(--ink-400)]">
            © {new Date().getFullYear()} Not affiliated with ABC or Sony Pictures Television.
          </p>
        </div>
      </div>
    </footer>
  )
}
