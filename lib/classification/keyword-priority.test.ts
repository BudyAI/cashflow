import assert from "node:assert/strict";
import test from "node:test";
import type { CategoryItem } from "../../types";
import { keywordClassifyBatch, type KeywordRule } from "./keyword-classifier.ts";

const baseDate = new Date().toISOString();

function makeCategories(overrides?: Partial<Record<string, number>>): CategoryItem[] {
  return [
    {
      id: "salaries",
      userId: null,
      name: "Salaries",
      color: "#ef4444",
      type: "expense",
      isDefault: true,
      sortOrder: overrides?.salaries ?? 2,
      createdAt: baseDate,
    },
    {
      id: "transfers",
      userId: null,
      name: "Transfers",
      color: "#a3a3a3",
      type: "expense",
      isDefault: true,
      sortOrder: overrides?.transfers ?? 5,
      createdAt: baseDate,
    },
    {
      id: "other",
      userId: null,
      name: "Other Expenses",
      color: "#94a3b8",
      type: "expense",
      isDefault: true,
      sortOrder: 99,
      createdAt: baseDate,
    },
  ];
}

const rules: KeywordRule[] = [
  { categoryId: "salaries", normalizedKeyword: "salary", confidence: 0.8 },
  { categoryId: "transfers", normalizedKeyword: "transfer", confidence: 0.99 },
];

test("category priority wins when multiple categories match", () => {
  const result = keywordClassifyBatch(
    makeCategories(),
    [{ id: "tx-1", description: "transfer to levi sep salary" }],
    rules,
  );
  assert.equal(result[0]?.categoryId, "salaries");
});

test("changing category order changes winner", () => {
  const result = keywordClassifyBatch(
    makeCategories({ salaries: 10, transfers: 1 }),
    [{ id: "tx-2", description: "transfer to levi sep salary" }],
    rules,
  );
  assert.equal(result[0]?.categoryId, "transfers");
});

test("equal category priority uses deterministic keyword fallback", () => {
  const tieCategories = makeCategories({ salaries: 2, transfers: 2 });
  const tieRules: KeywordRule[] = [
    { categoryId: "salaries", normalizedKeyword: "salary", confidence: 0.8 },
    { categoryId: "transfers", normalizedKeyword: "transfer salary", confidence: 0.4 },
  ];
  const result = keywordClassifyBatch(
    tieCategories,
    [{ id: "tx-3", description: "transfer salary received" }],
    tieRules,
  );
  assert.equal(result[0]?.categoryId, "transfers");
});
