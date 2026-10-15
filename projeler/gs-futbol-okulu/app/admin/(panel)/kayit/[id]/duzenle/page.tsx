import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseIdParam, toRegistrationDto } from "@/lib/api";
import { can, requireAdmin } from "@/lib/auth/server";
import { getRegistration } from "@/lib/registrations";
import { registrationToFormValues } from "@/lib/registrations-client";
import { REGISTRATION_FIELDS, validateRegistrationAdmin, type RegistrationField } from "@/lib/validation";
import { RegistrationFormPage } from "../../RegistrationFormPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bilgileri düzenle" };

export default async function EditRegistrationPage({ params, searchParams }: PageProps<"/admin/kayit/[id]/duzenle">) {
  const admin = await requireAdmin("kayit.duzenle");
  const id = parseIdParam((await params).id);
  const row = id ? getRegistration(id) : null;
  if (!row) notFound();
  const sensitive = can(admin, "hassas.gor");
  // Hassas bilgi izni yoksa bu alanlar tarayıcıya hiç gönderilmez; sunucu kaydederken eskilerini korur.
  const reg = toRegistrationDto(sensitive ? row : { ...row, studentTc: null, fatherTc: null, motherTc: null, homeAddress: "", bloodGroup: "" });
  const alan = (await searchParams).alan;
  const focusField = typeof alan === "string" && (REGISTRATION_FIELDS as readonly string[]).includes(alan) ? (alan as RegistrationField) : null;
  // Kayıtlı bilgideki hatalar (ör. geçersiz T.C.) form açılır açılmaz işaretlenir.
  const check = validateRegistrationAdmin(registrationToFormValues(reg));
  return <RegistrationFormPage reg={reg} hiddenSensitive={!sensitive} focusField={focusField} initialErrors={check.success ? undefined : check.errors} />;
}
