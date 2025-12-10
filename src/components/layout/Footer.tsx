import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t bg-gray-50 py-12 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold mb-3">Browse</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/products" className="hover:text-gray-900">All Products</Link></li>
              <li><Link href="/sharks" className="hover:text-gray-900">The Sharks</Link></li>
              <li><Link href="/seasons" className="hover:text-gray-900">By Season</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Discover</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/products?status=active" className="hover:text-gray-900">Still in Business</Link></li>
              <li><Link href="/products?deal=deal" className="hover:text-gray-900">Got a Deal</Link></li>
              <li><Link href="/products?deal=no_deal" className="hover:text-gray-900">No Deal</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Categories</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/categories/food-beverage" className="hover:text-gray-900">Food & Beverage</Link></li>
              <li><Link href="/categories/technology" className="hover:text-gray-900">Technology</Link></li>
              <li><Link href="/categories/health-wellness" className="hover:text-gray-900">Health & Wellness</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">About</h3>
            <p className="text-sm text-gray-600">
              The most comprehensive directory of Shark Tank products with real-time business status tracking.
            </p>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Shark Tank Products Directory. Not affiliated with ABC or Sony Pictures Television.
        </div>
      </div>
    </footer>
  )
}
