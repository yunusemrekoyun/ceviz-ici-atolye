import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listStaff, listStaffRoles, roleUserCounts } from "@/lib/team";
import { TeamManager } from "./TeamManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ekip ve Roller" };

export default async function TeamPage() {
  const me = await requireAdmin("ekip.yonet");
  const staff = listStaff().map(({ passwordHash, ...u }) => ({ ...u, hasPassword: Boolean(passwordHash) }));
  const roles = listStaffRoles();
  return (
    <main className="panel-rise mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Ekip ve Roller</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">Panele giren yöneticiler ve antrenörler. Her rol bir izin kümesidir; yeni rol açıp izinlerini seçebilirsiniz.</p>
      <TeamManager meId={me.id} staff={staff} roles={roles} counts={roleUserCounts()} permissions={PERMISSIONS.map((p) => ({ ...p }))} />
    </main>
  );
}
