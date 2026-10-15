"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatTRY } from "@/lib/utils";

type Point = { month: string; revenue: number };

export function RevenueChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C6FF3D" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#C6FF3D" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
        <XAxis dataKey="month" stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
        <Tooltip
          contentStyle={{ background: "#11141B", border: "1px solid #ffffff15", borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: "#ffffff80" }}
          formatter={(v: number) => [formatTRY(v), "Gelir"]}
        />
        <Area type="monotone" dataKey="revenue" stroke="#C6FF3D" strokeWidth={2} fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
