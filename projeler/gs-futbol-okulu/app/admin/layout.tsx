import type { Metadata } from "next";
import "./panel.css";

export const metadata: Metadata = {
  title: "Yönetim Paneli",
  appleWebApp: { capable: true, title: "KGS Panel", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="admin-theme flex min-h-dvh flex-1 flex-col">{children}</div>;
}
