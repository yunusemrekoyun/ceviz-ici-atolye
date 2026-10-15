import { requireTrainer } from "@/lib/auth";
import { MesajlarClient } from "./MesajlarClient";

export const metadata = { title: "Mesajlar" };

export default async function EgitmenMesajlarPage() {
  await requireTrainer();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Mesajlar</h1>
        <p className="text-body text-sm mt-0.5">Üyelerinle doğrudan yazış.</p>
      </div>
      <MesajlarClient />
    </div>
  );
}
