// Sayfa verisi gelene kadar ekranı doldurur: alt bilgi görünüp sonra aşağı itilmez (CLS).
export default function PageLoading({ text = "Yükleniyor…" }) {
  return (
    <div className="min-h-screen py-10 text-center" role="status">
      {text}
    </div>
  );
}
