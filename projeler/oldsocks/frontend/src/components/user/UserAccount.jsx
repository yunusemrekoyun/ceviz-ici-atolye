import React, { useState } from "react";
import UserPasswordForm from "./UserPasswordForm";
import DeleteAccountForm from "./DeleteAccountForm";
import PhoneField from "./PhoneField";
import Logout from "../auth/Logout";
import { AccountExpandable, AccountGroup, AccountRow } from "./AccountSection";

// Profil sekmesi: iletişim bilgileri, şifre, çıkış ve hesap silme; telefon ayarları gibi
// gruplanmış satırlar. Şifre ve hesap silme dokununca açılır.
export default function UserAccount({ user, onUserChange }) {
  const [open, setOpen] = useState(null); // "password" | "delete" | null
  const toggle = (key) => setOpen((current) => (current === key ? null : key));

  if (!user) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white ring-1 ring-black/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AccountGroup title="İletişim bilgileri">
        <AccountRow label="E-posta">{user.email}</AccountRow>
        <PhoneField phone={user.phone} onSaved={(phone) => onUserChange((prev) => ({ ...prev, phone }))} />
      </AccountGroup>

      <AccountGroup title="Güvenlik">
        <AccountExpandable
          label="Şifre"
          hint="Değiştirmek için dokunun"
          open={open === "password"}
          onToggle={() => toggle("password")}
        >
          <UserPasswordForm />
        </AccountExpandable>
      </AccountGroup>

      {/* Masaüstünde çıkış soldaki menüde */}
      <div className="lg:hidden">
        <AccountGroup>
          <Logout variant="row" />
        </AccountGroup>
      </div>

      <AccountGroup>
        <AccountExpandable
          label="Hesabı sil"
          tone="danger"
          open={open === "delete"}
          onToggle={() => toggle("delete")}
        >
          <DeleteAccountForm onCancel={() => setOpen(null)} />
        </AccountExpandable>
      </AccountGroup>
    </div>
  );
}
