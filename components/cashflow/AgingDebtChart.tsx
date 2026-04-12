"use client";
import useSWR from "swr";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatK } from "./CashflowContext";

interface AgingReport {
  id: string;
  reportDate: string;
  currency: "USD" | "ILS";
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const BUCKET_COLORS = {
  Current: "#22c55e",
  "1–30 days": "#eab308",
  "31–60 days": "#f97316",
  "61–90 days": "#ea580c",
  "90+ days": "#dc2626",
} as const;

type BucketRow = { bucket: string; amount: number; color: string };

export function AgingDebtChart() {
  const { data: reports, isLoading } = useSWR<AgingReport[]>(
    "/api/aging",
    fetcher,
  );

  const latest = (reports ?? [])[0];
  const chartCurrency = latest?.currency ?? "USD";

  const chartData: BucketRow[] = latest
    ? [
        {
          bucket: "Current",
          amount: latest.current,
          color: BUCKET_COLORS.Current,
        },
        {
          bucket: "1–30 days",
          amount: latest.days1to30,
          color: BUCKET_COLORS["1–30 days"],
        },
        {
          bucket: "31–60 days",
          amount: latest.days31to60,
          color: BUCKET_COLORS["31–60 days"],
        },
        {
          bucket: "61–90 days",
          amount: latest.days61to90,
          color: BUCKET_COLORS["61–90 days"],
        },
        {
          bucket: "90+ days",
          amount: latest.days90plus,
          color: BUCKET_COLORS["90+ days"],
        },
      ]
    : [];

  const pieSlices = chartData.filter((d) => d.amount > 0);

  if (isLoading) {
    return <div className="animate-pulse bg-slate-100 rounded-xl h-[360px]" />;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Aging Debt</h3>
        <p className="text-sm text-slate-400 mt-0.5">
          Accounts receivable by overdue bucket
          {latest ? ` (as of ${formatDate(latest.reportDate)})` : ""}
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-base gap-2">
          <span>
            Upload an aging report on the Transactions page to see your debt
            breakdown
          </span>
        </div>
      ) : pieSlices.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-base">
          No receivable balance in this report.
        </div>
      ) : (
        <>
          <div className="w-full min-h-[360px]">
            <ResponsiveContainer width="100%" height={360}>
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={pieSlices}
                  dataKey="amount"
                  nameKey="bucket"
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius="72%"
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={1}
                  label={false}
                >
                  {pieSlices.map((entry) => (
                    <Cell key={entry.bucket} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    formatK(Number(value), chartCurrency),
                    "Amount",
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "14px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div
            className="mt-4 flex flex-wrap justify-center gap-3"
            role="list"
            aria-label="Aging buckets"
          >
            {pieSlices.map((d) => {
              return (
                <div
                  key={d.bucket}
                  role="listitem"
                  className="min-w-[8rem] max-w-[10.5rem] flex-1 rounded-lg border border-y border-r border-slate-200 border-l-[5px] bg-white px-3.5 py-3 shadow-sm"
                  style={{ borderLeftColor: d.color }}
                >
                  <p
                    className="text-sm font-semibold text-slate-900 leading-snug truncate"
                    title={d.bucket}
                  >
                    {d.bucket}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 tabular-nums leading-snug">
                    {formatK(d.amount, chartCurrency)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Uploaded reports</p>
            <div className="space-y-1">
              {(reports ?? []).map(r => {
                const total = r.current + r.days1to30 + r.days31to60 + r.days61to90 + r.days90plus
                const rowCcy = r.currency ?? 'USD'
                return (
                  <div key={r.id} className="flex items-center justify-between text-xs text-slate-600">
                    <span>{formatDate(r.reportDate)}</span>
                    <span className="text-slate-400">Total: {formatK(total, rowCcy)}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="text-slate-300 hover:text-red-400 transition-colors ml-3"
                      aria-label={`Delete report ${formatDate(r.reportDate)}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div> */}
        </>
      )}
    </div>
  );
}
