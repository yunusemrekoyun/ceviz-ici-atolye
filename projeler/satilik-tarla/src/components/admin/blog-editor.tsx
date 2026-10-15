'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Trash2 } from 'lucide-react';
import { deleteBlogPost, saveBlogPost } from '@/app/admin/rehber/actions';
import { ActionForm } from './action-form';
import { AdminInput, AdminSelect, Field, dangerBtn } from './ui';
import { RichEditor } from './rich-editor';
import { cn } from '@/lib/utils';

export type BlogPostRow = {
  id: string;
  title: string;
  category: string;
  body: string;
  status: string;
};

function PostFields({ post }: { post?: BlogPostRow }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem_10rem]">
        <Field label="Başlık">
          <AdminInput name="title" defaultValue={post?.title} required />
        </Field>
        <Field label="Kategori">
          <AdminInput
            name="category"
            defaultValue={post?.category}
            placeholder="Yatırım"
            required
          />
        </Field>
        <Field label="Durum">
          <AdminSelect name="status" defaultValue={post?.status ?? 'yayinda'}>
            <option value="yayinda">Yayında</option>
            <option value="taslak">Taslak</option>
          </AdminSelect>
        </Field>
      </div>
      <Field label="Metin">
        <RichEditor name="body" initialHtml={post?.body ?? ''} minHeight="12rem" />
      </Field>
    </div>
  );
}

export function NewBlogPostForm() {
  return (
    <ActionForm action={saveBlogPost.bind(null, null)} submitLabel="Yazıyı Ekle">
      <PostFields />
    </ActionForm>
  );
}

export function BlogPostEditor({ post }: { post: BlogPostRow }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <article className="overflow-hidden rounded-2xl border border-[#D9E3D5] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-[#1f2a1d]">{post.title}</span>
          <span className="mt-0.5 block text-xs text-[#4b5b47]">
            {post.category} · {post.status === 'yayinda' ? 'Yayında' : 'Taslak'}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={cn('shrink-0 text-[#3d5638] transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div className="border-t border-[#D9E3D5] p-5">
          <ActionForm action={saveBlogPost.bind(null, post.id)}>
            <PostFields post={post} />
          </ActionForm>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm('Bu yazıyı silmek istediğinize emin misiniz?')) return;
              startTransition(async () => {
                await deleteBlogPost(post.id);
                router.refresh();
              });
            }}
            className={cn(dangerBtn, 'mt-4')}
          >
            <Trash2 size={15} />
            Yazıyı Sil
          </button>
        </div>
      ) : null}
    </article>
  );
}
