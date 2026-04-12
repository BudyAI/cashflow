export type Currency = 'USD' | 'ILS'

export interface ParsedTransaction {
  date: Date
  description: string
  originalDescription: string
  amount: number
  currency: Currency
  balance?: number | null
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  errors: string[]
}

export interface ClassificationResult {
  id: string
  categoryId: string
  confidence: number
}

export interface TransactionWithCategory {
  id: string
  userId: string
  uploadBatchId: string
  date: string
  description: string
  originalDescription: string
  amount: number
  balance: number | null
  categoryId: string | null
  categoryConfidence: number | null
  classifiedBy: string
  manuallyOverridden: boolean
  overrideHistory: string
  currency: Currency
  createdAt: string
  updatedAt: string
  category: {
    id: string
    name: string
    color: string
    type: string
  } | null
}

export interface CategoryItem {
  id: string
  userId: string | null
  name: string
  color: string
  type: string
  isDefault: boolean
  sortOrder: number
  createdAt: string
}

export interface MonthlySummary {
  month: string
  income: number
  expenses: number
  net: number
  runningTotal: number
}

export interface CashflowCategory {
  id: string
  name: string
  color: string
  totals: Record<string, number>
}

// keep old name as alias for backwards compat
export type CashflowExpenseCategory = CashflowCategory

export interface CashflowSummary {
  totalIncome: number
  totalExpenses: number
  netCashflow: number
  periods: MonthlySummary[]
  // table data
  months: string[]
  income: Record<string, number>
  incomeCategories: CashflowCategory[]
  expenseCategories: CashflowCategory[]
  totalExpensesPerMonth: Record<string, number>
  beginningBalances: Record<string, number>
  endingBalances: Record<string, number>
}

export interface ConsolidatedCashflowMeta {
  rateProvider: 'ECB_EXR'
  note: string
}

export type ConsolidatedCashflowResponse = CashflowSummary & { meta: ConsolidatedCashflowMeta }

export interface UploadBatchStatus {
  id: string
  status: 'processing' | 'complete' | 'failed'
  totalRows: number
  processedRows: number
  errors: string[]
}

export interface UploadBatch {
  id: string
  status: 'processing' | 'complete' | 'failed'
  totalRows: number
  processedRows: number
  createdAt: string
}

export interface AgingColumnMapping {
  dueDate: string        // required
  amount: string         // required
  currency?: string
  customer?: string
  contactName?: string
  issueDate?: string
  invoiceNumber?: string
}

export interface AgingFilePreview {
  headers: string[]
  sampleRows: string[][]
  suggestedMapping: Partial<AgingColumnMapping>
}

export interface ColumnMapping {
  date: string
  description: string
  amountMode: 'single' | 'debitcredit'
  amount?: string
  debit?: string
  credit?: string
  balance?: string
  currency?: string
}

export interface FilePreview {
  headers: string[]
  sampleRows: string[][]
  suggestedMapping: {
    date: string | null
    description: string | null
    amountMode: 'single' | 'debitcredit'
    amount: string | null
    debit: string | null
    credit: string | null
    balance: string | null
    currency: string | null
  }
}

export interface TransactionFilters {
  search?: string
  categoryId?: string
  dateFrom?: string
  dateTo?: string
  type?: 'income' | 'expense'
  currency?: Currency
  page?: number
  pageSize?: number
}
