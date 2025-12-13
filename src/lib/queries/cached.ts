/**
 * React Cache Wrapper for Database Queries
 *
 * This file wraps all query functions with React's cache() to deduplicate
 * queries within the same render tree. This prevents the same query from
 * running multiple times on a single page render.
 *
 * Usage: Import from this file instead of direct query modules
 * Example: import { getProducts } from '@/lib/queries/cached'
 */

import { cache } from 'react'
import * as products from './products'
import * as sharks from './sharks'
import * as episodes from './episodes'
import * as categories from './categories'

// ============================================================================
// PRODUCTS MODULE
// ============================================================================

export const getProducts = cache(products.getProducts)
export const getProductBySlug = cache(products.getProductBySlug)
export const getProductsBySeason = cache(products.getProductsBySeason)
export const getProductsByEpisode = cache(products.getProductsByEpisode)
export const getProductSlugs = cache(products.getProductSlugs)
export const getActiveProducts = cache(products.getActiveProducts)
export const getRecentProducts = cache(products.getRecentProducts)
export const getProductStats = cache(products.getProductStats)
export const getTopDeals = cache(products.getTopDeals)
export const getFeaturedDeal = cache(products.getFeaturedDeal)
export const getSuccessStories = cache(products.getSuccessStories)
export const getLatestEpisodeProducts = cache(products.getLatestEpisodeProducts)
export const getTrendingProducts = cache(products.getTrendingProducts)
export const getSeasonProducts = cache(products.getSeasonProducts)
export const getSharkPhotos = cache(products.getSharkPhotos)
export const getProductsByCategory = cache(products.getProductsByCategory)

// ============================================================================
// SHARKS MODULE
// ============================================================================

export const getSharks = cache(sharks.getSharks)
export const getSharkSlugs = cache(sharks.getSharkSlugs)
export const getSharkBySlug = cache(sharks.getSharkBySlug)
export const getSharkStats = cache(sharks.getSharkStats)
export const getAllSharkStats = cache(sharks.getAllSharkStats)
export const getSharkProducts = cache(sharks.getSharkProducts)
export const getSharkTopPerformers = cache(sharks.getSharkTopPerformers)
export const getSharkRecentFailures = cache(sharks.getSharkRecentFailures)
export const getSharkCoInvestors = cache(sharks.getSharkCoInvestors)
export const getSharkTimeline = cache(sharks.getSharkTimeline)
export const getLeaderboardSharks = cache(sharks.getLeaderboardSharks)

// ============================================================================
// EPISODES MODULE
// ============================================================================

export const getSeasons = cache(episodes.getSeasons)
export const getSeasonNumbers = cache(episodes.getSeasonNumbers)
export const getEpisodesBySeason = cache(episodes.getEpisodesBySeason)
export const getEpisode = cache(episodes.getEpisode)
export const getEpisodeProducts = cache(episodes.getEpisodeProducts)
export const getLatestEpisode = cache(episodes.getLatestEpisode)
export const getSeasonStats = cache(episodes.getSeasonStats)

// ============================================================================
// CATEGORIES MODULE
// ============================================================================

export const getCategories = cache(categories.getCategories)
export const getCategorySlugs = cache(categories.getCategorySlugs)
export const getCategoryBySlug = cache(categories.getCategoryBySlug)
export const getCategoryProducts = cache(categories.getCategoryProducts)
export const getCategoriesWithCounts = cache(categories.getCategoriesWithCounts)

// ============================================================================
// TYPE RE-EXPORTS
// ============================================================================

// Re-export types for convenience
export type { ProductFilters } from './products'
export type { SharkProductFilters } from './sharks'
