import { Component } from "react";
import { isChunkLoadError, reloadWithoutCache } from "../../utils/chunkErrors";

export default class AppErrorBoundary extends Component {
  state = { failed: false, outdated: false };

  static getDerivedStateFromError(error) {
    return { failed: true, outdated: isChunkLoadError(error) };
  }

  componentDidCatch(error) {
    console.error("Sayfa yüklenemedi:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 text-gray-900">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold">Sayfa yüklenemedi</h1>
          <p className="mt-3 text-sm leading-6 text-gray-700">
            {this.state.outdated
              ? "Site bu sekme açıkken güncellendi. Sayfayı yeniden yükleyip kaldığınız yerden devam edin."
              : "Beklenmeyen bir hata oluştu. Sayfayı yeniden yükleyin; sorun sürerse biraz sonra tekrar deneyin."}
          </p>
          <button
            type="button"
            onClick={reloadWithoutCache}
            className="mt-6 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Sayfayı yeniden yükle
          </button>
        </div>
      </main>
    );
  }
}
