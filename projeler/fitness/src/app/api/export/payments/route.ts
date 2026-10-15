import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PaymentStatus, PaymentMethod } from "@prisma/client";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") || undefined;
  const from = sp.get("from") ? new Date(sp.get("from")!) : undefined;
  const to = sp.get("to") ? new Date(sp.get("to")!) : undefined;

  const payments = await prisma.payment.findMany({
    where: {
      ...(branchId ? { member: { branchId } } : {}),
      ...(from || to ? { paidAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    include: {
      member: {
        include: {
          user: { select: { name: true, email: true } },
          branch: { select: { name: true } },
        },
      },
      membership: { include: { plan: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const STATUS_LABELS: Record<PaymentStatus, string> = {
    PENDING: "Beklemede",
    PAID: "Ödendi",
    FAILED: "Başarısız",
    REFUNDED: "İade",
  };
  const METHOD_LABELS: Record<PaymentMethod, string> = {
    CASH: "Nakit",
    CARD: "Kart",
    TRANSFER: "Transfer",
    STRIPE: "Stripe",
    IYZICO: "iyzico",
    PAYTR: "PayTR",
  };

  const rows = [
    ["Fatura No", "Ad Soyad", "E-posta", "Şube", "Plan", "Tutar (₺)", "Yöntem", "Durum", "Tarih"].join(","),
    ...payments.map((p) =>
      [
        p.invoiceNo || "",
        `"${p.member.user.name}"`,
        p.member.user.email,
        `"${p.member.branch?.name || ""}"`,
        `"${p.membership?.plan.name || ""}"`,
        (Number(p.amount) / 100).toFixed(2),
        METHOD_LABELS[p.method],
        STATUS_LABELS[p.status],
        p.paidAt ? new Date(p.paidAt).toLocaleDateString("tr-TR") : "",
      ].join(",")
    ),
  ].join("\n");

  return new NextResponse("﻿" + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="odemeler-${Date.now()}.csv"`,
    },
  });
}
