import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseIdParam } from "@/lib/api";
import { studentAttendance, summarize } from "@/lib/attendance";
import { lastAuditOf, listAudit } from "@/lib/audit";
import { can, requireAdmin } from "@/lib/auth/server";
import { discountedFee } from "@/lib/billing-shared";
import { accessOf, listPayments } from "@/lib/billing";
import { activeCard } from "@/lib/cards";
import { listItems, listOrders } from "@/lib/equipment";
import { guardiansOfStudent } from "@/lib/guardians";
import { loadBillingView, loadPanelData } from "@/lib/panel-data";
import { getSettings } from "@/lib/settings";
import { StudentFile, type FileData } from "./StudentFile";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/admin/kayit/[id]">): Promise<Metadata> {
  void params;
  return { title: "Öğrenci dosyası" };
}

export default async function StudentFilePage({ params }: PageProps<"/admin/kayit/[id]">) {
  const admin = await requireAdmin("kayit.gor");
  const id = parseIdParam((await params).id);
  if (!id) notFound();
  const { registrations, groups } = loadPanelData(new Date(), can(admin, "hassas.gor"));
  const reg = registrations.find((r) => r.id === id);
  if (!reg) notFound();

  const student = reg.status === "enrolled" || reg.status === "left";
  const seesBilling = can(admin, "aidat.gor");
  const { billing } = loadBillingView([], { view: false, collect: can(admin, "aidat.al") });
  const feeKurus = discountedFee(getSettings().feeAmountKurus, reg.discountPercent);
  const records = student ? studentAttendance(id, 40) : [];
  const card = student && can(admin, "kayit.duzenle") ? activeCard(id) : null;
  const enrolledBy = student ? (lastAuditOf("registration", id, ["kayit.asil", "kayit.elle-ekle"])?.userName ?? null) : null;
  const last = student && seesBilling ? listPayments({ registrationId: id, limit: 10 }).find((p) => !p.voidedAt) : undefined;

  const data: FileData = {
    reg,
    groups,
    related: registrations.filter((r) => r.id !== id && (reg.duplicates?.includes(r.id) ?? false)),
    booked: registrations.filter((r) => r.status === "scheduled" && r.appointmentAt).map((r) => ({ id: r.id, appointmentAt: r.appointmentAt! })),
    billing,
    access: seesBilling && reg.status === "enrolled" ? accessOf(reg) : null,
    feeKurus,
    orders: seesBilling ? listOrders().filter((o) => o.registrationId === id) : null,
    items: seesBilling ? listItems() : [],
    attendance: student ? { summary: summarize(records), recent: records.slice(0, 12).map((r) => ({ date: r.date, status: r.status })) } : null,
    guardians: can(admin, "veli.yonet") && student ? guardiansOfStudent(id).map((u) => ({ id: u.id, name: u.fullName, phone: u.phone, email: u.email, status: u.status, lastLoginAt: u.lastLoginAt })) : null,
    card: card ? { code: card.code, issuedAt: card.createdAt, printedAt: card.printedAt ?? null } : null,
    enrolledBy,
    lastPayment: student && seesBilling ? (last ? { paidOn: last.paidOn, method: last.method, amountKurus: last.amountKurus, takenBy: last.takenBy, createdAt: last.createdAt } : null) : undefined,
    history: can(admin, "guvenlik.gor") ? listAudit({ entity: "registration", entityId: id, limit: 25 }).map((a) => ({ id: a.id, at: a.createdAt, who: a.userName, summary: a.summary })) : null,
    can: {
      edit: can(admin, "kayit.duzenle"),
      remove: can(admin, "kayit.sil"),
      collect: can(admin, "aidat.al"),
      billing: seesBilling,
      development: can(admin, "gelisim.gir"),
      groups: can(admin, "program.yonet"),
      guardians: can(admin, "veli.yonet"),
      promise: seesBilling && can(admin, "erisim.ac"),
    },
  };
  return <StudentFile data={data} />;
}
