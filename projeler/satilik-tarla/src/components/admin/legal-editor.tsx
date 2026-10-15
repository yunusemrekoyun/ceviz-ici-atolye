'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { updateLegalDoc } from '@/app/admin/hukuki/actions';
import { ActionForm } from './action-form';
import { AdminInput, Field } from './ui';
import { RichEditor } from './rich-editor';
import { cn } from '@/lib/utils';

export function LegalDocEditor({
  docKey,
  title,
  body,
  exists,
}: {
  docKey: string;
  title: string;
  body: string;
  exists: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-[#D9E3D5] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-[#1f2a1d]">{title}</span>
          <span className="mt-0.5 block text-xs text-[#4b5b47]">
            /yasal/{docKey}
            {exists ? '' : ' · henüz yazılmadı'}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={cn('shrink-0 text-[#3d5638] transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div className="border-t border-[#D9E3D5] p-5">
          <ActionForm action={updateLegalDoc.bind(null, docKey)}>
            <div className="grid gap-4">
              <Field label="Belge başlığı">
                <AdminInput name="title" defaultValue={title} required />
              </Field>
              <Field label="Metin">
                <RichEditor name="body" initialHtml={body} minHeight="20rem" />
              </Field>
            </div>
          </ActionForm>
        </div>
      ) : null}
    </article>
  );
}
