import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { fetchStats } from "@/lib/stats";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const branchId = req.nextUrl.searchParams.get("branchId") || undefined;
  const data = await fetchStats(branchId);
  return NextResponse.json(data);
}
