"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface MetricLine {
  key: string;
  label: string;
  color: string;
}

interface Props {
  data: Record<string, unknown>[];
  lines: MetricLine[];
}

export default function MemberProgressChart({ data, lines }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
        <XAxis dataKey="date" stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{ background: "#11141B", border: "1px solid #ffffff15", borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: "#ffffff80" }}
        />
        {lines.map(({ key, label, color }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={label}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
