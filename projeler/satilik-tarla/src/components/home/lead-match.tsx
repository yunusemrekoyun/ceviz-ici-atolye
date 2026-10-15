'use client';

import { useActionState, useMemo } from 'react';
import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SectionHeading } from '@/components/site/section-heading';
import { Reveal } from '@/components/motion/reveal';
import { createLead } from '@/lib/actions/lead';
import { LEAD_PURPOSES } from '@/lib/actions/lead-schema';
import type { ActionResult } from '@/lib/action-result';
import { useStore } from '@/store';

const fieldLabel =
  'mb-2 block text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground';

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1.5 text-sm text-destructive">{errors[0]}</p>;
}

/** "Bana Uygun Araziyi Bul" talep formu — lead'i DB'ye yazar, admin'e ve
 * (e-posta verildiyse) talep sahibine kuyruk üzerinden e-posta gider. */
export function LeadMatch() {
  const { content } = useStore();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createLead, {
    ok: false,
  });
  // Anti-spam zaman damgası: formun sunucudan servis edildiği an — sunucu değeri
  // kasıtlı olarak korunur (input'taki suppressHydrationWarning bu yüzden).
  // eslint-disable-next-line react-hooks/purity
  const ts = useMemo(() => Date.now(), []);
  const fe = state.fieldErrors ?? {};
  const done = state.ok;

  return (
    <section id="talep" aria-label="Arazi talebi" className="bg-muted py-14 sm:py-24">
      <div className="container">
        <SectionHeading
          index="05"
          eyebrow="Talep"
          title={content.sections.matchTitle}
          subtitle={content.sections.matchSubtitle}
        />

        <Reveal className="mt-10">
          {done ? (
            <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-8 text-center shadow-soft">
              <CircleCheck className="mx-auto h-10 w-10 text-brass-strong" aria-hidden="true" />
              <h3 className="mt-4 font-heading text-xl font-bold text-foreground">
                Talebinizi aldık
              </h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Kriterlerinize uygun ilanları derleyip en kısa sürede sizinle iletişime geçeceğiz.
              </p>
            </div>
          ) : (
            <form
              action={formAction}
              className="rounded-lg border border-border bg-card p-5 shadow-soft sm:p-8"
            >
              {/* Anti-spam: honeypot + render zaman damgası */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />
              <input type="hidden" name="ts" value={ts} suppressHydrationWarning />

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="lead-name" className={fieldLabel}>
                    Ad Soyad
                  </Label>
                  <Input id="lead-name" name="name" required className="h-12 bg-white" />
                  <FieldError errors={fe.name} />
                </div>
                <div>
                  <Label htmlFor="lead-phone" className={fieldLabel}>
                    Telefon
                  </Label>
                  <Input
                    id="lead-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="05xx xxx xx xx"
                    required
                    className="h-12 bg-white"
                  />
                  <FieldError errors={fe.phone} />
                </div>
                <div>
                  <Label htmlFor="lead-email" className={fieldLabel}>
                    E-posta <span className="normal-case tracking-normal">(isteğe bağlı)</span>
                  </Label>
                  <Input id="lead-email" name="email" type="email" className="h-12 bg-white" />
                  <FieldError errors={fe.email} />
                </div>
                <div>
                  <Label htmlFor="lead-budget" className={fieldLabel}>
                    Bütçe <span className="normal-case tracking-normal">(isteğe bağlı)</span>
                  </Label>
                  <Input
                    id="lead-budget"
                    name="budget"
                    placeholder="örn. 1.500.000 ₺'ye kadar"
                    className="h-12 bg-white"
                  />
                </div>
                <div>
                  <Label className={fieldLabel}>İlçe</Label>
                  <Select name="district">
                    <SelectTrigger
                      aria-label="İlçe"
                      className="h-12 w-full rounded-md border-input bg-white"
                    >
                      <SelectValue placeholder="Fark etmez" />
                    </SelectTrigger>
                    <SelectContent>
                      {content.districts.map((d) => (
                        <SelectItem key={d.name} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={fieldLabel}>Kullanım Amacı</Label>
                  <Select name="purpose">
                    <SelectTrigger
                      aria-label="Kullanım Amacı"
                      className="h-12 w-full rounded-md border-input bg-white"
                    >
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_PURPOSES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="lead-note" className={fieldLabel}>
                    Notunuz <span className="normal-case tracking-normal">(isteğe bağlı)</span>
                  </Label>
                  <Textarea
                    id="lead-note"
                    name="note"
                    rows={3}
                    placeholder="Aradığınız arazinin özellikleri, konum tercihi..."
                    className="bg-white"
                  />
                  <FieldError errors={fe.note} />
                </div>
              </div>

              <label className="mt-5 flex items-start gap-3 text-[14px] leading-relaxed text-muted-foreground">
                <input
                  type="checkbox"
                  name="kvkkConsent"
                  required
                  className="mt-1 h-4 w-4 shrink-0 accent-[hsl(154_42%_15%)]"
                />
                <span>
                  Kişisel verilerimin{' '}
                  <Link
                    href="/yasal/kvkk"
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    KVKK Aydınlatma Metni
                  </Link>{' '}
                  kapsamında işlenmesini kabul ediyorum.
                </span>
              </label>
              <FieldError errors={fe.kvkkConsent} />

              {state.error ? <p className="mt-4 text-sm text-destructive">{state.error}</p> : null}

              <Button
                type="submit"
                variant="brass"
                size="lg"
                disabled={pending}
                className="mt-6 h-[52px] w-full text-base sm:w-auto sm:px-10"
              >
                {pending ? 'Gönderiliyor…' : 'Talebimi Gönder'}
              </Button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
