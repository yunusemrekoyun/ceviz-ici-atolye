'use client';

import { MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { telLink } from '@/store';
import type { Listing } from '@/content';

/** İlan detayında mobil sabit alt bar: fiyat her an görünür, CTA'lar başparmak
 * erişiminde. Genel Ara+WhatsApp barının ilana özel karşılığı (sahibinden
 * kalıbı); ileride "Mesaj Gönder" butonu da buraya gelecek. */
export function DetailActionBar({
  listing,
  phone,
  wa,
}: {
  listing: Listing;
  phone: string;
  wa: string;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-2">
        {/* Fiyat tek satır — karar anı bilgisi, butonlara yapışmadan nefes alır */}
        <div className="nums min-w-0 flex-1 truncate font-heading text-[17px] font-bold leading-none text-foreground">
          <span className="sr-only">Fiyat: </span>
          {listing.price}
        </div>
        <Button asChild className="h-12 shrink-0 gap-2 px-4 text-[15px]">
          <a href={telLink(phone)} aria-label={`Telefonla arayın: ${phone}`}>
            <Phone className="size-5" />
            Ara
          </a>
        </Button>
        {/* WhatsApp palet hiyerarşisinde: çam çerçeve, turkuaz yalnız ikonda */}
        <Button
          asChild
          variant="outline"
          className="h-12 shrink-0 gap-2 border-primary/30 px-4 text-[15px] text-primary hover:border-primary/50"
        >
          <a href={wa} target="_blank" rel="noreferrer">
            <MessageCircle className="size-5 text-whatsapp" />
            WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}
