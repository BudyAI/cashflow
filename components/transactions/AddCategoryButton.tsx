'use client'
import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'

const COLORS = [
  '#94a3b8', '#f87171', '#fb923c', '#fbbf24',
  '#a3e635', '#34d399', '#22d3ee', '#60a5fa',
  '#a78bfa', '#f472b6',
]

export function AddCategoryButton() {
  const { createCategory } = useCategories()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [color, setColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleOpen() {
    setOpen(true)
    setName('')
    setError(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleClose() {
    setOpen(false)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createCategory(name.trim(), color, type)
      setOpen(false)
      setName('')
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 text-sm px-2 py-2 border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
        title="Add category"
      >
        <Plus className="w-4 h-4" />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={handleClose} />

          <div className="absolute top-full mt-2 left-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-4 w-64">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">New category</span>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                ref={inputRef}
                type="text"
                placeholder="Category name"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={50}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex gap-2">
                {(['expense', 'income'] as const).map((t: 'expense' | 'income') => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors capitalize ${
                      type === t
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1.5">Color</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={!name.trim() || saving}
                className="w-full text-sm bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving…' : 'Add category'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
