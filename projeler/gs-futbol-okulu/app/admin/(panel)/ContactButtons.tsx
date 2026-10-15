import { telLink, whatsappLink } from "@/lib/whatsapp";

/** Veliyi tek dokunuşla arama ve hazır mesajlı WhatsApp. */
export function ContactButtons({ phone, message, size = "md" }: { phone: string; message?: string; size?: "sm" | "md" }) {
  const base =
    size === "sm"
      ? "min-h-10 flex-1 gap-1.5 rounded-xl px-3 text-sm"
      : "min-h-12 flex-1 gap-2 rounded-xl px-4 text-[15px]";
  return (
    <div className="flex gap-2">
      <a
        href={telLink(phone)}
        onClick={(e) => e.stopPropagation()}
        className={`${base} inline-flex items-center justify-center border border-gray-300 bg-white font-semibold text-ink transition hover:border-gray-400 hover:bg-gray-50 active:scale-[0.97]`}
      >
        <svg className="h-5 w-5 text-gs-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
        </svg>
        Ara
      </a>
      <a
        href={whatsappLink(phone, message)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`${base} inline-flex items-center justify-center border border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 active:scale-[0.97]`}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z" />
        </svg>
        WhatsApp
      </a>
    </div>
  );
}
