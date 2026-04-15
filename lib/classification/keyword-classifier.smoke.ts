import type { CategoryItem } from '@/types'
import { keywordClassifyBatch, type KeywordRule } from './keyword-classifier'

function makeCategories(): CategoryItem[] {
  const base = new Date().toISOString()
  return [
    { id: 'income', userId: null, name: 'Income', color: '#22c55e', type: 'income', isDefault: true, sortOrder: 1, createdAt: base },
    { id: 'salaries', userId: null, name: 'Salaries', color: '#ef4444', type: 'expense', isDefault: true, sortOrder: 2, createdAt: base },
    { id: 'cc', userId: null, name: 'Credit Card', color: '#ec4899', type: 'expense', isDefault: true, sortOrder: 5, createdAt: base },
    { id: 'transfers', userId: null, name: 'Transfers', color: '#a3a3a3', type: 'expense', isDefault: true, sortOrder: 5, createdAt: base },
    { id: 'fees', userId: null, name: 'Interest / Bank Fees', color: '#06b6d4', type: 'expense', isDefault: true, sortOrder: 6, createdAt: base },
    { id: 'other', userId: null, name: 'Other Expenses', color: '#94a3b8', type: 'expense', isDefault: true, sortOrder: 99, createdAt: base },
  ]
}

function assertEqual(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${String(expected)}, got ${String(actual)}`)
  }
}

export function runKeywordClassifierSmoke() {
  const categories = makeCategories()
  const rules: KeywordRule[] = [
    { categoryId: 'salaries', normalizedKeyword: 'salary', confidence: 0.95 },
    { categoryId: 'salaries', normalizedKeyword: 'משכורת', confidence: 0.95 },
    { categoryId: 'transfers', normalizedKeyword: 'העברה', confidence: 0.95 },
    { categoryId: 'transfers', normalizedKeyword: 'העברה בנקאית', confidence: 0.95 },
    { categoryId: 'cc', normalizedKeyword: 'ישראכרט', confidence: 0.9 },
    { categoryId: 'cc', normalizedKeyword: 'cal', confidence: 0.9 },
    { categoryId: 'fees', normalizedKeyword: 'עמלה', confidence: 0.85 },
  ]
  const results = keywordClassifyBatch(categories, [
    { id: '1', description: 'העברה בין חשבונות' },
    { id: '2', description: 'בנק לאומי העברה בנקאית' },
    { id: '3', description: 'ישראכרט חיוב כרטיס' },
    { id: '4', description: 'CAL credit card payment' },
    { id: '5', description: 'עמלת פעולה' },
    { id: '6', description: 'העברה משכורת' },
  ], rules)

  const byId = new Map(results.map(r => [r.id, r.categoryId]))
  assertEqual(byId.get('1'), 'transfers', 'Hebrew transfer maps to Transfers')
  assertEqual(byId.get('2'), 'transfers', 'Leumi transfer maps to Transfers')
  assertEqual(byId.get('3'), 'cc', 'Isracard maps to Credit Card')
  assertEqual(byId.get('4'), 'cc', 'CAL maps to Credit Card')
  assertEqual(byId.get('5'), 'fees', 'Hebrew fee maps to Bank Fees')
  assertEqual(byId.get('6'), 'salaries', 'Salary wins over transfer when both appear')
}

if (require.main === module) {
  runKeywordClassifierSmoke()
  // eslint-disable-next-line no-console
  console.log('keyword-classifier smoke OK')
}

