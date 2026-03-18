'use client'
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'cashflow-forecast'

export type ForecastData = Record<string, number> // key: `${month}:${rowKey}`

export function useForecast() {
  const [data, setData] = useState<ForecastData>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setData(JSON.parse(stored))
    } catch {}
  }, [])

  const setValue = useCallback((month: string, rowKey: string, value: number | null) => {
    setData(prev => {
      const next = { ...prev }
      const key = `${month}:${rowKey}`
      if (value === null) {
        delete next[key]
      } else {
        next[key] = value
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const getValue = useCallback((month: string, rowKey: string): number | null => {
    return data[`${month}:${rowKey}`] ?? null
  }, [data])

  return { getValue, setValue }
}
