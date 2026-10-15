import Link from "next/link";
import type { Registration } from "@/lib/db/schema";

/** Kardeşler arasında geçiş: büyük, dokunması kolay sekmeler. */
export function ChildTabs({ kids, selectedId, base }: { kids: Registration[]; selectedId: number | null; base: string }) {
  if (kids.length < 2) return null;
  return (
    <nav className="veli-child-tabs" aria-label="Çocuklarım">
      {kids.map((c) => (
        <Link
          key={c.id}
          href={`${base}${base.includes("?") ? "&" : "?"}ogrenci=${c.id}`}
          aria-current={c.id === selectedId ? "page" : undefined}
        >
          {c.studentFullName.split(" ")[0]}
        </Link>
      ))}
    </nav>
  );
}

export function NoChildren() {
  return (
    <div className="veli-empty">
      <h2 className="veli-title">Hesabınıza bağlı öğrenci yok</h2>
      <p>Öğrenciniz kayıttan ayrılmış olabilir ya da bağlantı henüz yapılmamış. Lütfen okulu arayın.</p>
    </div>
  );
}
