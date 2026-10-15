import { can, requireAdmin } from "@/lib/auth/server";
import { billingCounts, ensurePeriodsToday } from "@/lib/billing";
import { unreadCount } from "@/lib/notifications";
import { getPanelCounts } from "@/lib/registrations";
import { issueCount } from "@/lib/data-issues-server";
import { AdminShell } from "./AdminShell";

export const dynamic = "force-dynamic";

/** Panelin tüm sayfaları buradan geçer: geçerli oturum yoksa giriş ekranına yönlendirilir. */
export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const counts = { ...getPanelCounts(), notifications: unreadCount(admin), issues: can(admin, "kayit.gor") ? issueCount(can(admin, "hassas.gor")) : 0 };
  if (can(admin, "aidat.gor")) {
    ensurePeriodsToday();
    const b = billingCounts();
    counts.claims = b.claims;
    counts.locked = b.locked;
  }
  return (
    <AdminShell username={admin.fullName ?? admin.username ?? "Yönetici"} permissions={admin.permissions} counts={counts}>
      {children}
    </AdminShell>
  );
}
