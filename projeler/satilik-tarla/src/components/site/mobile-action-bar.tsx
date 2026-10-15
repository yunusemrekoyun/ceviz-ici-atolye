'use client';

import { usePathname } from 'next/navigation';
import { MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore, telLink, waLink } from '@/store';

/** Mobilde her an elin altında: büyük Ara + WhatsApp butonları. */
export function MobileActionBar() {
  const { content } = useStore();
  const pathname = usePathname();
  // İlan detayında ilana özel bar (DetailActionBar) var — çifte bar olmasın.
  if (pathname.startsWith('/ilan/')) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Button asChild className="h-12 gap-2 text-base">
          <a href={telLink(content.contact.phone)}>
            <Phone className="size-5" />
            Hemen Ara
          </a>
        </Button>
        {/* WhatsApp palet hiyerarşisinde: çam çerçeve, turkuaz yalnız ikonda */}
        <Button
          asChild
          variant="outline"
          className="h-12 gap-2 border-primary/30 bg-card text-base text-primary hover:border-primary/50"
        >
          <a
            href={waLink(
              content.contact.whatsapp,
              'Merhaba, Kütahya’da arazi arıyorum, bilgi alabilir miyim?',
            )}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="size-5 text-whatsapp" />
            WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}
