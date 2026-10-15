"use client";

import { useRef } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { useUpload } from "@/hooks/useUpload";

interface Props {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  aspectClass?: string;
}

export function ImageUploadInput({ value, onChange, folder = "general", aspectClass = "aspect-video" }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useUpload(folder);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file);
    if (url) onChange(url);
    if (ref.current) ref.current.value = "";
  }

  return (
    <div className="w-full">
      <input ref={ref} type="file" accept="image/*" className="sr-only" onChange={handleFile} />

      {value ? (
        <div className={`relative w-full ${aspectClass} rounded-xl overflow-hidden border border-subtle group`}>
          <img src={value} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => ref.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs hover:bg-white/30 transition-colors"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Değiştir
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-1.5 rounded-lg bg-rose-500/70 text-white hover:bg-rose-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="w-full h-24 rounded-xl border border-dashed border-subtle-md hover:border-neon/40 bg-subtle hover:bg-neon/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted hover:text-neon disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">Yükleniyor…</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-5 h-5" />
              <span className="text-xs">Görsel seç veya sürükle</span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
    </div>
  );
}
