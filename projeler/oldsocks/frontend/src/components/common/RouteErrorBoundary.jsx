import { Component } from "react";
import { useLocation } from "react-router-dom";
import { isChunkLoadError, reloadWithoutCache } from "../../utils/chunkErrors";

class Boundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Sayfa hatası:", error);
  }

  componentDidUpdate(prevProps) {
    // Başka sayfaya geçilince hata ekranı kalkar.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const outdated = isChunkLoadError(error);

    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 py-12" role="alert">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold text-dark1">
            {outdated ? "Site güncellendi" : "Bu sayfada bir sorun oluştu"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-dark2">
            {outdated
              ? "Siz bu sekmedeyken sitenin yeni sürümü yayınlandı. Sayfayı yenileyip kaldığınız yerden devam edin."
              : "Tekrar deneyin. Sorun sürerse sayfayı yenileyin ya da ana sayfaya dönün."}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {outdated ? (
              <button
                type="button"
                onClick={reloadWithoutCache}
                className="rounded-lg bg-dark1 px-5 py-3 text-sm font-semibold text-white hover:bg-dark2"
              >
                Sayfayı yenile
              </button>
            ) : (
              <button
                type="button"
                onClick={() => this.setState({ error: null })}
                className="rounded-lg bg-dark1 px-5 py-3 text-sm font-semibold text-white hover:bg-dark2"
              >
                Tekrar dene
              </button>
            )}
            <a
              href="/"
              className="rounded-lg border border-light2 px-5 py-3 text-sm font-semibold text-dark1 hover:bg-light1"
            >
              Ana sayfa
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <Boundary resetKey={pathname}>{children}</Boundary>;
}
