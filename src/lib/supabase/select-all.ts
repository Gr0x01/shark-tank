/**
 * PostgREST returns at most 1000 rows for an unbounded select, with no error and no
 * warning — you just get a short list. Every query that enumerates the whole catalogue
 * silently truncated the day the catalogue passed 1000 products (Aug 2, 2026): the
 * sitemap dropped ~595 products, /seasons lost seasons 1-6, and the {total} token in
 * editorial copy started claiming 1000 products instead of 1595.
 *
 * Use this for any query meant to cover the entire catalogue. For a genuinely bounded
 * list (top 10, one page of results) keep using .limit().
 */
export async function selectAll<T>(
  // The Supabase query builder is generic to the point of being unusable here, and the
  // callers span both the request-scoped and static clients.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build: () => any,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = []

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break

    rows.push(...(data as T[]))
    if (data.length < pageSize) break
  }

  return rows
}
