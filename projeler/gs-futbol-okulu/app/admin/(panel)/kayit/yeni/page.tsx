import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/server";
import { RegistrationFormPage } from "../RegistrationFormPage";
import { QuickNewForm } from "./QuickNewForm";

export const metadata: Metadata = { title: "Yeni kayıt" };

export default async function NewRegistrationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("kayit.duzenle");
  // Varsayılan: sahada hızlı kayıt (4 bilgi). ?tam=1 ile tüm alanlı form.
  return (await searchParams).tam === "1" ? <RegistrationFormPage reg={null} /> : <QuickNewForm />;
}
