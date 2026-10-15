"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

export function CancelAppointmentBtn({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("Bu randevuyu iptal etmek istediğine emin misin?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/panel/appointments/${appointmentId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="btn-ghost btn-sm text-rose-400 hover:text-rose-300 p-1.5"
      title="Randevuyu İptal Et"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
    </button>
  );
}
