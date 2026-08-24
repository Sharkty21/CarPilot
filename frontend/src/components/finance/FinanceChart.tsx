import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompactCurrency, formatCurrency } from "@/src/lib/format";
import type { SchedulePoint } from "./schedule";

interface FinanceChartProps {
  data: SchedulePoint[];
  equityLabel: string;
  debtLabel: string;
  /** Month index of "today", drawn as a vertical marker. */
  currentMonth?: number;
}

const FinanceChart = ({
  data,
  equityLabel,
  debtLabel,
  currentMonth,
}: FinanceChartProps) => {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-blue-100 bg-blue-50/30 text-sm text-slate-400">
        Add the term and payment amount to see the payoff chart
      </div>
    );
  }

  const marker = data.find((point) => point.month === currentMonth);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="size-2.5 rounded-full bg-blue-500" />
          {equityLabel}
        </span>
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="size-2.5 rounded-full bg-slate-300" />
          {debtLabel}
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="debtFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.04} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#eef4fc" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(value: number) => formatCompactCurrency(value)}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #dbeafe",
                fontSize: 12,
                boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
              }}
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                name === "equity" ? equityLabel : debtLabel,
              ]}
            />

            {marker && (
              <ReferenceLine
                x={marker.label}
                stroke="#60a5fa"
                strokeDasharray="4 4"
                label={{
                  value: "Today",
                  position: "insideTopRight",
                  fill: "#60a5fa",
                  fontSize: 11,
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="debt"
              stackId="1"
              stroke="#94a3b8"
              strokeWidth={2}
              fill="url(#debtFill)"
            />
            <Area
              type="monotone"
              dataKey="equity"
              stackId="1"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#equityFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FinanceChart;
