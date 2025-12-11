'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface SearchResult {
  slug: string
  name: string
  company_name: string
  photo_url: string | null
}

export function useSearchTypeahead(query: string, debounceMs = 300) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`,
        { signal: abortControllerRef.current.signal }
      )

      if (!response.ok) throw new Error('Search failed')

      const data = await response.json()
      setResults(data.products || [])
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }

      // Handle different error types
      if (!navigator.onLine) {
        setError('No internet connection')
      } else {
        setError('Search temporarily unavailable')
      }

      console.error('Search error:', err)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query)
    }, debounceMs)

    return () => {
      clearTimeout(timer)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [query, debounceMs, search])

  return { results, isLoading, error }
}
