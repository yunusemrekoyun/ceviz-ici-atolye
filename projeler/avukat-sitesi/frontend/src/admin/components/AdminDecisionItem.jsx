export default function AdminDecisionItem({ decision, onEdit, onDelete }) {
  const imgUrl = decision?.image?.url || "";
  const dateStr = decision.date
    ? new Date(decision.date).toLocaleDateString("tr-TR")
    : "";

  return (
    <article className="group relative overflow-hidden rounded-[var(--radius-2xl)] border border-border/60 bg-surface/80 shadow-[var(--shadow-soft)]">
      <div className="relative h-40 w-full overflow-hidden">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={decision.imageAlt || decision.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted">
            Görsel yok
          </div>
        )}
        <button
          onClick={() => onDelete(decision)}
          className="absolute right-3 top-3 rounded-md bg-black/35 px-2 py-1 text-[12px] backdrop-blur hover:bg-black/45"
          title="Sil"
        >
          Sil
        </button>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 text-[17px] font-semibold leading-[1.25]">
          {decision.title}
        </h3>

        <div className="mt-1 text-[13px] text-muted">
          {decision.chamber || "—"} {dateStr && `• ${dateStr}`}
        </div>

        <p className="mt-2 line-clamp-2 text-[14px] text-[color:var(--color-muted)]">
          {decision.summary}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted">
          {decision.tags?.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded border border-border/60 px-2 py-0.5"
            >
              {t}
            </span>
          ))}
          <span className="ml-auto">{decision.caseNo || ""}</span>
        </div>

        <button
          onClick={() => onEdit(decision)}
          className="mt-4 w-full rounded-[var(--radius-lg)] border border-border bg-surface py-2 text-[14px] hover:bg-surface-2"
        >
          Düzenle
        </button>
      </div>
    </article>
  );
}
