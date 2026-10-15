import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

function HashScroll() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    // bir sonraki frame’de, içerik mount olduktan sonra kaydır
    requestAnimationFrame(() => {
      const id = hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [pathname, hash]);

  return null;
}

export default function Layout({ children }) {
  return (
    <div className="min-h-dvh bg-bg text-foreground">
      <Header />
      <HashScroll />
      <main className="container-x">{children}</main>
      <Footer />
    </div>
  );
}
