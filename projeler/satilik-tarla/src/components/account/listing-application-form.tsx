'use client';

import { useActionState, useState } from 'react';
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
import { LAND_TYPES } from '@/content';
import { cn } from '@/lib/utils';
import type { ActionResult } from '@/lib/action-result';

const fieldLabel =
  'mb-2 block text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground';

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1.5 text-sm text-destructive">{errors[0]}</p>;
}

export type ApplicationDefaults = Partial<{
  title: string;
  district: string;
  location: string;
  type: string;
  purpose: 'satilik' | 'kiralik';
  areaM2: string;
  priceTRY: string;
  description: string;
  droneRequested: boolean;
}>;

/** İlan başvuru formu — hem yeni başvuru (/ilan-ver) hem reddedilen ilanın
 * düzeltilip yeniden gönderimi (İlanlarım) aynı bileşeni kullanır. */
export function ListingApplicationForm({
  action,
  districts,
  defaults = {},
  submitLabel = 'Başvuruyu Gönder',
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  districts: string[];
  defaults?: ApplicationDefaults;
  submitLabel?: string;
}) {
  // React 19, action'lı formu HER gönderimden sonra sıfırlar — doğrulama
  // hatasında kullanıcının yazdıkları kaybolmasın diye gönderilen değerleri
  // saklayıp formu bu değerlerle yeniden kuruyoruz (attempt key'i remount eder).
  const [attempt, setAttempt] = useState(0);
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (!result?.ok) {
        const v: Record<string, string> = {};
        formData.forEach((val, k) => {
          if (typeof val === 'string') v[k] = val;
        });
        setValues(v);
        setAttempt((n) => n + 1);
      }
      return result;
    },
    { ok: false },
  );
  const fe = state.fieldErrors ?? {};

  const eff: ApplicationDefaults = values
    ? {
        title: values.title ?? '',
        district: values.district || defaults.district,
        location: values.location ?? '',
        type: values.type || defaults.type,
        purpose: (values.purpose as 'satilik' | 'kiralik') ?? 'satilik',
        areaM2: values.areaM2 ?? '',
        priceTRY: values.priceTRY ?? '',
        description: values.description ?? '',
        droneRequested: 'droneRequested' in values,
      }
    : defaults;

  return (
    <form key={attempt} action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label className={fieldLabel}>İlçe</Label>
          <Select name="district" defaultValue={eff.district} required>
            <SelectTrigger className="h-12 w-full rounded-md border-input bg-white">
              <SelectValue placeholder="Seçin" />
            </SelectTrigger>
            <SelectContent>
              {districts.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={fe.district} />
        </div>
        <div>
          <Label className={fieldLabel}>Arazi Türü</Label>
          <Select name="type" defaultValue={eff.type} required>
            <SelectTrigger className="h-12 w-full rounded-md border-input bg-white">
              <SelectValue placeholder="Seçin" />
            </SelectTrigger>
            <SelectContent>
              {LAND_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={fe.type} />
        </div>
      </div>

      <div>
        <Label className={fieldLabel}>İlan Amacı</Label>
        <div className="flex gap-3">
          {(
            [
              ['satilik', 'Satılık'],
              ['kiralik', 'Kiralık'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={cn(
                'flex h-12 flex-1 cursor-pointer items-center justify-center rounded-md border text-[15px] font-semibold transition-colors',
                'border-input bg-white text-foreground/70 has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:checked]:text-foreground',
              )}
            >
              <input
                type="radio"
                name="purpose"
                value={value}
                defaultChecked={(eff.purpose ?? 'satilik') === value}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        <FieldError errors={fe.purpose} />
      </div>

      <div>
        <Label htmlFor="app-location" className={fieldLabel}>
          Konum Tarifi
        </Label>
        <Input
          id="app-location"
          name="location"
          placeholder="örn. Tavşanlı Çukurköy yolu üzeri, köy girişine 1 km"
          defaultValue={eff.location}
          required
          className="h-12 bg-white"
        />
        <FieldError errors={fe.location} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="app-area" className={fieldLabel}>
            Alan (m²)
          </Label>
          <Input
            id="app-area"
            name="areaM2"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="örn. 12500"
            defaultValue={eff.areaM2}
            required
            className="h-12 bg-white"
          />
          <FieldError errors={fe.areaM2} />
        </div>
        <div>
          <Label htmlFor="app-price" className={fieldLabel}>
            Fiyat (₺)
          </Label>
          <Input
            id="app-price"
            name="priceTRY"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="örn. 1850000"
            defaultValue={eff.priceTRY}
            required
            className="h-12 bg-white"
          />
          <FieldError errors={fe.priceTRY} />
        </div>
      </div>

      <div>
        <Label htmlFor="app-title" className={fieldLabel}>
          İlan Başlığı <span className="normal-case tracking-normal">(isteğe bağlı)</span>
        </Label>
        <Input
          id="app-title"
          name="title"
          placeholder="Boş bırakırsanız otomatik oluşturulur"
          defaultValue={eff.title}
          className="h-12 bg-white"
        />
        <FieldError errors={fe.title} />
      </div>

      <div>
        <Label htmlFor="app-desc" className={fieldLabel}>
          Açıklama
        </Label>
        <Textarea
          id="app-desc"
          name="description"
          rows={5}
          placeholder="Arazinin özellikleri, yol/su/elektrik durumu hakkında bildikleriniz, çevresi..."
          defaultValue={eff.description}
          required
          className="bg-white"
        />
        <FieldError errors={fe.description} />
      </div>

      <label className="flex items-start gap-3 rounded-md border border-input bg-white p-4 text-[14px] leading-relaxed text-foreground/85">
        <input
          type="checkbox"
          name="droneRequested"
          defaultChecked={eff.droneRequested}
          className="mt-1 h-4 w-4 shrink-0 accent-[hsl(154_42%_15%)]"
        />
        <span>
          <span className="font-semibold text-foreground">Drone çekimi istiyorum.</span> Ekibimiz
          sahada fotoğraf çekimini her durumda yapar; bu kutuyu işaretlerseniz havadan drone videosu
          da çekilir.
        </span>
      </label>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button
        type="submit"
        variant="brass"
        size="lg"
        disabled={pending}
        className="h-[52px] w-full text-base sm:w-auto sm:px-10"
      >
        {pending ? 'Gönderiliyor…' : submitLabel}
      </Button>
    </form>
  );
}
