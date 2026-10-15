"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { ProgressChart } from "./ProgressChart";

const Inner = dynamic(
  () => import("./ProgressChart").then((m) => ({ default: m.ProgressChart })),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-xl bg-subtle" /> }
);

export function ProgressChartLazy(props: ComponentProps<typeof ProgressChart>) {
  return <Inner {...props} />;
}
