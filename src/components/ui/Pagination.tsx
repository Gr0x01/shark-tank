import Link from 'next/link'

interface PaginationProps {
  page: number
  /** Omitted when the total is unknown (a filtered view), which falls back to Previous/Next. */
  totalPages?: number
  hasNextPage: boolean
  buildHref: (page: number) => string
}

/**
 * Numbered pagination for the product directory.
 *
 * Previous/Next alone left the back of the catalogue many clicks from the root — page 15
 * needed fourteen sequential requests to reach, which suppresses crawl priority for
 * everything down there. Numbered links with first/last shortcuts put every page within
 * two hops.
 *
 * Filtered views have no cheap total, so they keep the Previous/Next behaviour. That is
 * also the case that carries a canonical pointing back at the unfiltered directory, so
 * there is no crawl depth to win.
 */
export function Pagination({ page, totalPages, hasNextPage, buildHref }: PaginationProps) {
  if (!totalPages) {
    if (page === 1 && !hasNextPage) return null
    return (
      <nav aria-label="Product pages" className="flex items-center justify-between gap-4 mt-10">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className="btn-secondary" rel="prev">← Previous</Link>
        ) : <span />}
        <span className="text-sm text-[var(--ink-500)]">Page {page}</span>
        {hasNextPage ? (
          <Link href={buildHref(page + 1)} className="btn-secondary" rel="next">Next →</Link>
        ) : <span />}
      </nav>
    )
  }

  if (totalPages <= 1) return null

  return (
    <nav aria-label="Product pages" className="products-pagination mt-10">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className="btn-secondary" rel="prev">← Previous</Link>
      ) : <span />}

      <ol className="products-pagination-list">
        {pageWindow(page, totalPages).map((entry, i) =>
          entry === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className="products-pagination-gap">…</li>
          ) : (
            <li key={entry}>
              <Link
                href={buildHref(entry)}
                className={`products-pagination-link${entry === page ? ' is-current' : ''}`}
                aria-current={entry === page ? 'page' : undefined}
                aria-label={`Page ${entry}`}
              >
                {entry}
              </Link>
            </li>
          )
        )}
      </ol>

      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className="btn-secondary" rel="next">Next →</Link>
      ) : <span />}
    </nav>
  )
}

/**
 * Page numbers to render: always the first and last, plus a window around the current
 * page, with `null` marking an elided run. Keeps first and last one click away at any
 * catalogue size.
 */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  const span = 1
  const wanted = new Set<number>([1, totalPages])

  for (let p = page - span; p <= page + span; p++) {
    if (p >= 1 && p <= totalPages) wanted.add(p)
  }

  const sorted = [...wanted].sort((a, b) => a - b)
  const out: (number | null)[] = []

  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null)
    out.push(p)
  })

  return out
}
