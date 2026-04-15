"use client";

import { useEffect, useMemo, useState } from "react";
import { Tags, X, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { CategoryKeywordItem } from "@/types";
import { useCategories } from "@/hooks/useCategories";

export function CategoryKeywordsManager() {
  const {
    categories,
    getCategoryKeywords,
    addCategoryKeyword,
    deleteCategoryKeyword,
    reorderCategories,
  } = useCategories();
  const [open, setOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [keywords, setKeywords] = useState<CategoryKeywordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  useEffect(() => {
    if (!open) return;
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, open, selectedCategoryId]);

  useEffect(() => {
    if (!open) return;
    setCategoryOrder(categories.map((category) => category.id));
  }, [categories, open]);

  useEffect(() => {
    if (!open || !selectedCategoryId) return;
    setLoading(true);
    setError(null);
    getCategoryKeywords(selectedCategoryId)
      .then(setKeywords)
      .catch(() => setError("Failed to load keywords"))
      .finally(() => setLoading(false));
  }, [open, selectedCategoryId, getCategoryKeywords]);

  async function handleAddKeyword() {
    const value = newKeyword.trim();
    if (!selectedCategoryId || !value) return;
    setSaving(true);
    setError(null);
    try {
      const created = await addCategoryKeyword(selectedCategoryId, value);
      setKeywords((current) => [...current, created]);
      setNewKeyword("");
    } catch {
      setError("Could not add keyword");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteKeyword(keyword: CategoryKeywordItem) {
    if (keyword.userId === null || !selectedCategoryId) return;
    try {
      await deleteCategoryKeyword(selectedCategoryId, keyword.id);
      setKeywords((current) => current.filter((item) => item.id !== keyword.id));
    } catch {
      setError("Could not delete keyword");
    }
  }

  function moveCategory(categoryId: string, direction: "up" | "down") {
    setCategoryOrder((current) => {
      const index = current.indexOf(categoryId);
      if (index < 0) return current;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  async function handleSaveCategoryOrder() {
    if (categoryOrder.length === 0) return;
    setReordering(true);
    setError(null);
    try {
      await reorderCategories(categoryOrder);
    } catch {
      setError("Could not save category priority");
    } finally {
      setReordering(false);
    }
  }

  const orderedCategories = useMemo(
    () =>
      categoryOrder
        .map((id) => categories.find((category) => category.id === id))
        .filter((category): category is NonNullable<typeof category> => Boolean(category)),
    [categories, categoryOrder],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors"
      >
        <Tags className="w-4 h-4" />
        Keywords
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            aria-label="Close keyword manager"
          />
          <div className="relative w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Category keywords</h2>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700"
                onClick={() => setOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-slate-800">Category priority</p>
                  <button
                    type="button"
                    onClick={() => void handleSaveCategoryOrder()}
                    disabled={reordering || categoryOrder.length === 0}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save order
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  When a description matches keywords from multiple categories, the higher category wins.
                </p>
                <ul className="divide-y divide-slate-100 rounded border border-slate-100 bg-slate-50">
                  {orderedCategories.map((category, index) => (
                    <li key={category.id} className="flex items-center justify-between px-2 py-1.5">
                      <span className="text-sm text-slate-700">{category.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveCategory(category.id, "up")}
                          disabled={index === 0 || reordering}
                          className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCategory(category.id, "down")}
                          disabled={index === orderedCategories.length - 1 || reordering}
                          className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <label className="block">
                <span className="text-sm text-slate-600">Category</span>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddKeyword();
                    }
                  }}
                  placeholder="Add keyword (e.g. payroll, uber)"
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => void handleAddKeyword()}
                  disabled={saving || !newKeyword.trim() || !selectedCategoryId}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 max-h-64 overflow-auto">
                {loading ? (
                  <p className="p-3 text-sm text-slate-500">Loading keywords...</p>
                ) : keywords.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">
                    No keywords yet for {selectedCategory?.name ?? "this category"}.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {keywords.map((keyword) => (
                      <li
                        key={keyword.id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{keyword.keyword}</span>
                          {keyword.userId === null && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              default
                            </span>
                          )}
                        </div>
                        {keyword.userId !== null && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteKeyword(keyword)}
                            className="text-slate-400 hover:text-red-600"
                            title="Remove keyword"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
