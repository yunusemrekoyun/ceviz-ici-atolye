export interface UploadResult {
  url: string;
  formats: {
    avif: Record<string, string>;
    webp: Record<string, string>;
    jpeg: Record<string, string>;
  };
}

/**
 * Uploads a file to /api/upload and returns URLs for all generated formats.
 * Throws on network error or non-OK response.
 */
export async function uploadImage(file: File, folder = "general"): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  const res  = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error ?? "Yükleme başarısız");

  const formats = data.formats as UploadResult["formats"];
  const url = formats.webp?.md ?? formats.jpeg?.md ?? "";

  return { url, formats };
}
