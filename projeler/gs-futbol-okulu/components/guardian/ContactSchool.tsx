import { formatPhone } from "@/lib/phone";
import { telLink, whatsappLink } from "@/lib/whatsapp";

export function ContactSchool({ phone, message }: { phone: string; message?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <a href={telLink(phone)} className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-line bg-white text-lg font-bold text-ink">
        Ara
      </a>
      <a href={whatsappLink(phone, message)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-emerald-700 text-lg font-bold text-white">
        WhatsApp
      </a>
      <p className="col-span-2 text-center text-sm text-muted">{formatPhone(phone)}</p>
    </div>
  );
}
