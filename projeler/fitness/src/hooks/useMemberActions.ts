"use client";

import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useToast } from "./useToast";
import type { MemberInitial } from "@/components/admin/MemberDialog";

export function useMemberActions() {
  const router = useRouter();
  const { toast } = useToast();

  const remove = async (id: string, name: string) => {
    if (!confirm(`"${name}" adlı üye silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await api.del(`/api/members/${id}`);
      toast({ type: "success", message: `${name} silindi.` });
      router.refresh();
    } catch (e) {
      toast({ type: "error", message: e instanceof ApiError ? e.message : "Silinemedi" });
    }
  };

  const getForEdit = async (id: string): Promise<MemberInitial | null> => {
    try {
      const data = await api.get<{ member: any }>(`/api/members/${id}`);
      if (!data.member) return null;
      const m = data.member;
      return {
        id: m.id,
        name: m.user.name,
        email: m.user.email,
        phone: m.user.phone,
        status: m.status,
        gender: m.gender,
        birthDate: m.birthDate,
        heightCm: m.heightCm,
        startWeightKg: m.startWeightKg,
        goal: m.goal,
        healthNotes: m.healthNotes,
        trainerId: m.trainerId,
        branchId: m.branchId,
      };
    } catch {
      toast({ type: "error", message: "Üye bilgileri alınamadı" });
      return null;
    }
  };

  return { remove, getForEdit };
}
