'use client'
import { useCallback } from 'react'
import useSWR from 'swr'
import type { CategoryItem, CategoryKeywordItem } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR<CategoryItem[]>(
    '/api/categories',
    fetcher
  )

  const createCategory = useCallback(async (name: string, color: string, type: string) => {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color, type }),
    })
    if (!res.ok) throw new Error('Failed to create category')
    await mutate()
    return res.json()
  }, [mutate])

  const deleteCategory = useCallback(async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete category')
    await mutate()
  }, [mutate])

  const reorderCategories = useCallback(async (orderedCategoryIds: string[]) => {
    const res = await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedCategoryIds }),
    })
    if (!res.ok) throw new Error('Failed to reorder categories')
    await mutate()
    return res.json()
  }, [mutate])

  const getCategoryKeywords = useCallback(async (categoryId: string): Promise<CategoryKeywordItem[]> => {
    const res = await fetch(`/api/categories/${categoryId}/keywords`)
    if (!res.ok) throw new Error('Failed to load keywords')
    return res.json()
  }, [])

  const addCategoryKeyword = useCallback(async (categoryId: string, keyword: string, confidence = 0.8) => {
    const res = await fetch(`/api/categories/${categoryId}/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, confidence }),
    })
    if (!res.ok) throw new Error('Failed to add keyword')
    return res.json()
  }, [])

  const deleteCategoryKeyword = useCallback(async (categoryId: string, keywordId: string) => {
    const res = await fetch(`/api/categories/${categoryId}/keywords/${keywordId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete keyword')
  }, [])

  return {
    categories: data ?? [],
    isLoading,
    error,
    mutate,
    createCategory,
    deleteCategory,
    reorderCategories,
    getCategoryKeywords,
    addCategoryKeyword,
    deleteCategoryKeyword,
  }
}
