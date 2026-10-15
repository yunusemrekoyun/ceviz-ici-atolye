import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { AdminMobileNav } from "./AdminMobileNav";

export const metadata = { title: "Admin Paneli" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const unreadCount = await prisma.notification.count({ where: { readAt: null } });

  return (
    <div className="min-h-screen flex bg-base">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={{ name: user.name, email: user.email, role: user.role }} unreadCount={unreadCount} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-x-hidden">{children}</main>
      </div>
      <AdminMobileNav />
    </div>
  );
}
