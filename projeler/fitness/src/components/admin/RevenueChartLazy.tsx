"use client";

import dynamic from "next/dynamic";

const Inner = dynamic(
  () => import("./RevenueChart").then((m) => ({ default: m.RevenueChart })),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-xl bg-subtle" /> }
);

export function RevenueChartLazy({ data }: { data: { month: string; revenue: number }[] }) {
  return <Inner data={data} />;
}
