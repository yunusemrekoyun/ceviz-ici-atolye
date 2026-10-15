"use client";

import { useState, useCallback } from "react";
import { uploadImage } from "@/lib/upload-client";

interface UseUploadReturn {
  upload: (file: File) => Promise<string | null>;
  uploading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * React hook for file uploads. Wraps uploadImage with loading + error state.
 *
 * const { upload, uploading, error } = useUpload("progress");
 * const url = await upload(file);  // null on error
 */
export function useUpload(folder = "general"): UseUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadImage(file, folder);
      return url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Yükleme başarısız";
      setError(msg);
      return null;
    } finally {
      setUploading(false);
    }
  }, [folder]);

  const clearError = useCallback(() => setError(null), []);

  return { upload, uploading, error, clearError };
}
