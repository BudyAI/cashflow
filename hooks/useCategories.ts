'use client'
import useSWR from 'swr'
import type { CategoryItem } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR<CategoryItem[]>(
    '/api/categories',
    fetcher
  )

  async function createCategory(name: string, color: string, type: string) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color, type }),
    })
    if (!res.ok) throw new Error('Failed to create category')
    await mutate()
    return res.json()
  }

  async function deleteCategory(id: string) {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete category')
    await mutate()
  }

  return {
    categories: data ?? [],
    isLoading,
    error,
    mutate,
    createCategory,
    deleteCategory,
  }
}
