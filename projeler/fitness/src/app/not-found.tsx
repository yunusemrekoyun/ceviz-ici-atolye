import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-6 text-center">
      <div>
        <div className="text-8xl font-bold text-gradient-neon">404</div>
        <h1 className="mt-4 h-display text-3xl">Sayfa bulunamadı</h1>
        <p className="mt-2 text-body">Aradığın sayfa taşınmış veya hiç var olmamış olabilir.</p>
        <Link href="/" className="mt-6 inline-flex btn-primary btn-md">Anasayfaya dön</Link>
      </div>
    </div>
  );
}
