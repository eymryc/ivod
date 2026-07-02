"use client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

interface StatsChartProps {
  data: Array<{ label: string; value: number }>;
  type?: "area" | "bar";
  color?: string;
  unit?: string;
  height?: number;
}

function CustomTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-none border border-white/[0.1] bg-[#121214] px-3 py-2 shadow-lg text-xs ring-1 ring-primary/10">
      <p className="text-white/40 mb-0.5 font-light">{label}</p>
      <p className="text-white font-semibold tabular-nums">
        {payload[0].value.toLocaleString("fr-CI")}
        {unit && <span className="text-primary/70 ml-1 font-medium">{unit}</span>}
      </p>
    </div>
  );
}

export function StatsChart({ data, type = "area", color = "#f97316", unit, height = 200 }: StatsChartProps) {
  const chartData = data.map((d) => ({ name: d.label, value: d.value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "bar" ? (
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#areaGrad)" dot={false} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
