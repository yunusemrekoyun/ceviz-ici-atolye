// src/components/decisions/DecisionSearch.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";

export default function DecisionSearch({
  onSelect,
  minChars = 2,
  limit = 8,
  placeholder = "Anahtar kelime ara (örn. ceza, iş, tazminat)",
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(0);

  const boxRef = useRef(null);
  const cacheRef = useRef(new Map());

  useEffect(() => {
    const onDocClick = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const s = q.trim();
    if (s.length < minChars) {
      setItems([]);
      setOpen(false);
      setErr("");
      setBusy(false);
      return;
    }
    const key = `${s.toLowerCase()}|${limit}`;
    setBusy(true);
    setErr("");
    const t = setTimeout(async () => {
      if (cacheRef.current.has(key)) {
        setItems(cacheRef.current.get(key));
        setOpen(true);
        setBusy(false);
        return;
      }
      try {
        const data = await api(
          `/decisions/keywords/suggest?q=${encodeURIComponent(
            s
          )}&limit=${limit}`
        );
        cacheRef.current.set(key, data || []);
        setItems(data || []);
        setOpen(true);
      } catch (e) {
        setErr(e.message || "Arama başarısız");
      } finally {
        setBusy(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, limit, minChars]);

  const hasResults = items.length > 0;

  const selectKeyword = (kw) => {
    if (!kw) return;
    setQ(kw);
    setOpen(false);
    onSelect?.(kw);
  };

  const onKeyDown = (e) => {
    if (!open || !hasResults) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectKeyword(items[active]?.keyword);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const renderKeyword = (text) => {
    const s = q.trim().toLowerCase();
    const k = String(text || "");
    const i = k.toLowerCase().indexOf(s);
    if (i < 0) return k;
    return (
      <>
        {k.slice(0, i)}
        <strong>{k.slice(i, i + s.length)}</strong>
        {k.slice(i + s.length)}
      </>
    );
  };

  const dropdown = useMemo(() => {
    if (!open) return null;
    return (
      <div
        id="decision-kw-list"
        role="listbox"
        className="
          absolute left-0 right-0 z-40 mt-2
          overflow-hidden rounded-2xl border border-border/70
          bg-[color:var(--color-surface)]/96 backdrop-blur
          shadow-2xl ring-1 ring-black/5
        "
      >
        {busy ? (
          <div className="px-4 py-3 text-sm text-muted">Aranıyor…</div>
        ) : err ? (
          <div className="px-4 py-3 text-sm text-red-300">{err}</div>
        ) : !hasResults ? (
          <div className="px-4 py-3 text-sm text-muted">Sonuç yok</div>
        ) : (
          <ul>
            {items.map((it, i) => (
              <li
                key={it.keyword}
                id={`opt-${i}`}
                role="option"
                aria-selected={active === i}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectKeyword(it.keyword)}
                className={[
                  "flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer",
                  active === i
                    ? "bg-foreground/[0.06]"
                    : "hover:bg-foreground/[0.04]",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm">
                    {renderKeyword(it.keyword)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    {typeof it.count === "number" && (
                      <span>{it.count} karar</span>
                    )}
                    {it.lastDate && (
                      <span className="ml-2">
                        • Son:{" "}
                        {new Date(it.lastDate).toLocaleDateString("tr-TR")}
                      </span>
                    )}
                  </div>
                </div>
                {typeof it.count === "number" && (
                  <span className="ml-2 shrink-0 rounded-full border border-border/60 bg-surface px-2 py-0.5 text-[11px] text-muted">
                    {it.count}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }, [open, busy, err, hasResults, items, active, q]);

  return (
   <div
  ref={boxRef}
  className="relative z-30 -mt-6 md:-mt-8 mb-4"
  role="combobox"
  aria-expanded={open}
>
      <div
        className="
          flex items-center gap-2
          rounded-[32px]
          border border-[color:var(--color-accent)]/35
          bg-[linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02))]
          backdrop-blur-sm
          px-4 py-3
          shadow-[0_6px_30px_-10px_rgba(0,0,0,.6)]
          hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,.65)]
          transition-shadow
          focus-within:ring-2 focus-within:ring-accent/40
        "
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </svg>

        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onFocus={() => items.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
          aria-autocomplete="list"
          aria-controls="decision-kw-list"
          aria-activedescendant={open ? `opt-${active}` : undefined}
        />

        {q && (
          <button
            onClick={() => {
              setQ("");
              setItems([]);
              setOpen(false);
            }}
            className="text-muted hover:text-foreground transition-colors"
            aria-label="Temizle"
          >
            ✕
          </button>
        )}
      </div>

      {dropdown}
    </div>
  );
}
