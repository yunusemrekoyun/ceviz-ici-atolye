'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Undo2,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/** Hukuki metin + rehber gövdesi için zengin editör. Değer HTML olarak
 * gizli input'la forma akar; sunucu tarafı sanitize eder. Eski düz metin
 * gövdeler paragraf paragraf HTML'e çevrilerek açılır. */
export function RichEditor({
  name,
  initialHtml,
  minHeight = '16rem',
}: {
  name: string;
  initialHtml: string;
  minHeight?: string;
}) {
  const hidden = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const content = /^\s*</.test(initialHtml)
    ? initialHtml
    : initialHtml
        .split(/\n{2,}|\n/)
        .filter(Boolean)
        .map((p) => `<p>${p}</p>`)
        .join('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      ImageExtension,
    ],
    content,
    onUpdate({ editor }) {
      if (hidden.current) hidden.current.value = editor.getHTML();
    },
  });

  useEffect(() => {
    if (hidden.current && editor) hidden.current.value = editor.getHTML();
  }, [editor]);

  if (!editor) {
    return (
      <div
        className="rounded-xl border border-[#D9E3D5] bg-white p-4 text-sm text-[#4b5b47]"
        style={{ minHeight }}
      >
        Editör yükleniyor…
      </div>
    );
  }

  const btn = (active: boolean) =>
    cn(
      'grid h-8 w-8 place-items-center rounded-md transition-colors',
      active ? 'bg-[#3d5638] text-[#FAF7EF]' : 'text-[#2d3a2a] hover:bg-[#1f2a1d]/5',
    );

  function setLink() {
    const prev = editor!.getAttributes('link').href as string | undefined;
    const url = window.prompt('Bağlantı adresi (https://…)', prev ?? 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor!.chain().focus().unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  async function uploadImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await fetch(
        `/api/admin/icerik-gorsel?filename=${encodeURIComponent(file.name)}`,
        { method: 'POST', body: file },
      );
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        editor!.chain().focus().setImage({ src: data.url }).run();
      } else {
        alert(data?.error ?? 'Görsel yüklenemedi.');
      }
    } catch {
      alert('Bağlantı hatası — tekrar deneyin.');
    }
    setUploading(false);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#D9E3D5] bg-white focus-within:border-[#3d5638]">
      <input ref={hidden} type="hidden" name={name} defaultValue={content} />
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[#D9E3D5] bg-[#FAF7EF] px-2 py-1.5">
        <button
          type="button"
          aria-label="Kalın"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btn(editor.isActive('bold'))}
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          aria-label="İtalik"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btn(editor.isActive('italic'))}
        >
          <Italic size={15} />
        </button>
        <span className="mx-1 h-5 w-px bg-[#D9E3D5]" />
        <button
          type="button"
          aria-label="Başlık"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btn(editor.isActive('heading', { level: 2 }))}
        >
          <Heading2 size={15} />
        </button>
        <button
          type="button"
          aria-label="Alt başlık"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={btn(editor.isActive('heading', { level: 3 }))}
        >
          <Heading3 size={15} />
        </button>
        <span className="mx-1 h-5 w-px bg-[#D9E3D5]" />
        <button
          type="button"
          aria-label="Liste"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btn(editor.isActive('bulletList'))}
        >
          <List size={15} />
        </button>
        <button
          type="button"
          aria-label="Sıralı liste"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btn(editor.isActive('orderedList'))}
        >
          <ListOrdered size={15} />
        </button>
        <button
          type="button"
          aria-label="Alıntı"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btn(editor.isActive('blockquote'))}
        >
          <Quote size={15} />
        </button>
        <button
          type="button"
          aria-label="Yatay çizgi"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={btn(false)}
        >
          <Minus size={15} />
        </button>
        <span className="mx-1 h-5 w-px bg-[#D9E3D5]" />
        <button
          type="button"
          aria-label="Bağlantı ekle"
          onClick={setLink}
          className={btn(editor.isActive('link'))}
        >
          <Link2 size={15} />
        </button>
        <button
          type="button"
          aria-label="Bağlantıyı kaldır"
          onClick={() => editor.chain().focus().unsetLink().run()}
          className={btn(false)}
        >
          <Link2Off size={15} />
        </button>
        <button
          type="button"
          aria-label="Görsel yükle"
          onClick={() => fileInput.current?.click()}
          className={btn(false)}
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
        </button>
        <span className="mx-1 h-5 w-px bg-[#D9E3D5]" />
        <button
          type="button"
          aria-label="Geri al"
          onClick={() => editor.chain().focus().undo().run()}
          className={btn(false)}
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          aria-label="Yinele"
          onClick={() => editor.chain().focus().redo().run()}
          className={btn(false)}
        >
          <Redo2 size={15} />
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          hidden
          onChange={(e) => {
            void uploadImage(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <EditorContent
        editor={editor}
        className="rich-editor-body px-4 py-3 text-sm text-[#1f2a1d]"
        style={{ minHeight }}
      />
    </div>
  );
}
