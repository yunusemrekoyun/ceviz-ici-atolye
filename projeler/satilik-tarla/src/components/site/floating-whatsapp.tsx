'use client';

import { MessageCircle } from 'lucide-react';
import { useStore, waLink } from '@/store';

export function FloatingWhatsApp() {
  const { content } = useStore();
  return (
    <a
      href={waLink(
        content.contact.whatsapp,
        'Merhaba, Kütahya’da arazi arıyorum, bilgi alabilir miyim?',
      )}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp’tan yazın"
      className="fixed bottom-5 right-4 z-40 hidden h-14 w-14 place-items-center rounded-full bg-whatsapp text-white shadow-soft-lg transition-transform duration-200 ease-out-quart hover:scale-105 active:scale-95 lg:right-6 lg:grid"
    >
      <span className="absolute inset-0 animate-ping-few rounded-full bg-whatsapp opacity-30" />
      <MessageCircle className="relative h-7 w-7" />
    </a>
  );
}
