import DecisionSearch from "../components/decisions/DecisionSearch";
import Decisions from "../components/decisions/Decisions";
import { useState, useEffect } from "react";

export default function DecisionPage() {
  const [kw, setKw] = useState("");
  const [visible, setVisible] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      if (window.innerWidth < 640) {
        setIsMobile(true);
        setVisible(6);
      } else {
        setIsMobile(false);
        setVisible(12);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section className="section-y">
      <div className="container-x">
        <header className="text-center">
          <h1 className="text-[32px] md:text-[36px] font-bold tracking-tight text-[color:var(--color-accent)]">
            Yargıtay Kararları
          </h1>
          <p className="mt-2 text-sm text-muted max-w-2xl mx-auto">
           <br/>
          </p>
        </header>

        <div className="mt-3 flex justify-center">
          <div className="w-full max-w-xl">
            <DecisionSearch onSelect={(k) => setKw(k)} />
            {kw && (
              <div className="mt-2 text-xs text-muted">
                Filtre: <strong>{kw}</strong>{" "}
                <button className="ml-1 underline" onClick={() => setKw("")}>
                  temizle
                </button>
              </div>
            )}
          </div>
        </div>

        <Decisions search={{ kw }} limit={visible} />

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisible((v) => v + (isMobile ? 10 : 12))}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2 transition"
          >
            Daha fazla listele
          </button>
        </div>
      </div>
    </section>
  );
}