"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutBtn() {
  const router = useRouter();
  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/giris");
    router.refresh();
  };
  return (
    <button onClick={onLogout} className="btn-ghost btn-sm">
      <LogOut className="w-4 h-4" /> Çıkış
    </button>
  );
}
