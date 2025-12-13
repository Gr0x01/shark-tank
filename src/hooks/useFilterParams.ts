'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useFilterParams(basePath: string = '/products') {
  const router = useRouter()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (key: string, value: string, action: 'add' | 'remove' | 'set') => {
      const params = new URLSearchParams(searchParams.toString())

      if (action === 'set') {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      } else if (action === 'add') {
        params.append(key, value)
      } else if (action === 'remove') {
        const values = params.getAll(key).filter(v => v !== value)
        params.delete(key)
        values.forEach(v => params.append(key, v))
      }

      return params.toString()
    },
    [searchParams]
  )

  const toggleFilter = useCallback(
    (key: string, value: string) => {
      const currentValues = searchParams.getAll(key)
      const action = currentValues.includes(value) ? 'remove' : 'add'
      const queryString = createQueryString(key, value, action)
      router.push(`${basePath}${queryString ? `?${queryString}` : ''}`, { scroll: false })
    },
    [searchParams, createQueryString, router, basePath]
  )

  const setFilter = useCallback(
    (key: string, value: string) => {
      const queryString = createQueryString(key, value, 'set')
      router.push(`${basePath}${queryString ? `?${queryString}` : ''}`, { scroll: false })
    },
    [createQueryString, router, basePath]
  )

  const removeFilter = useCallback(
    (key: string, value?: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value) {
        const values = params.getAll(key).filter(v => v !== value)
        params.delete(key)
        values.forEach(v => params.append(key, v))
      } else {
        params.delete(key)
      }

      router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
    },
    [searchParams, router, basePath]
  )

  const isChecked = useCallback(
    (key: string, value: string) => {
      return searchParams.getAll(key).includes(value)
    },
    [searchParams]
  )

  const clearAll = useCallback(() => {
    router.push(basePath, { scroll: false })
  }, [router, basePath])

  const getFilterValue = useCallback(
    (key: string) => searchParams.get(key) || '',
    [searchParams]
  )

  const getFilterValues = useCallback(
    (key: string) => searchParams.getAll(key),
    [searchParams]
  )

  return {
    searchParams,
    toggleFilter,
    setFilter,
    removeFilter,
    isChecked,
    clearAll,
    getFilterValue,
    getFilterValues,
  }
}
