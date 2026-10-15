// src/pages/ArticlePage.jsx
import Articles from "../components/articles/Articles";

export default function ArticlePage() {
  return (
    <section className="section-y">
      <div className="container-x">
        <header className="mb-8">
          <h1 className="text-[32px] md:text-[34px] font-semibold tracking-[-0.01em]">
            Makaleler
          </h1>
          <p className="mt-2 text-sm text-foreground/80">
            Güncel hukuki yorumlar, rehberler ve duyurular.
          </p>
        </header>

        <Articles />
      </div>
    </section>
  );
}