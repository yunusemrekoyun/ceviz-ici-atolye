// src/components/decisions/Decisions.jsx
import { useEffect, useState, useMemo } from "react";
import { DecisionAPI } from "../../lib/api";
import DecisionItem from "./DecisionItem";

export default function Decisions({ search = {}, limit }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await DecisionAPI.list(search);
        if (alive) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setErr(e.message || "Kararlar yüklenemedi");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [search]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [items]
  );

  const visibleItems = limit ? sorted.slice(0, limit) : sorted;

  if (busy)
    return (
      <div className="p-6 border rounded-lg bg-surface/70">Yükleniyor…</div>
    );
  if (err)
    return (
      <div className="p-6 border rounded-lg bg-red-500/10 text-red-200">
        {err}
      </div>
    );
  if (!visibleItems.length)
    return (
      <div className="p-6 border rounded-lg bg-surface/70">
        Henüz karar eklenmemiş.
      </div>
    );

  return (
    <div className="grid grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {visibleItems.map((d) => (
        <DecisionItem key={d._id || d.slug} item={d} />
      ))}
    </div>
  );
}