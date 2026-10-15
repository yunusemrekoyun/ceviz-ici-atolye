"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { MemberDialog } from "./MemberDialog";

export function NewMemberButton({ plans, trainers, branches }: { plans: any[]; trainers: any[]; branches: any[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary btn-md">
        <UserPlus className="w-4 h-4" /> Yeni Üye
      </button>
      <MemberDialog open={open} onClose={() => setOpen(false)} plans={plans} trainers={trainers} branches={branches} />
    </>
  );
}
