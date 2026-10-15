import { dayLabel } from "@/lib/billing-shared";
import type { Progress } from "@/lib/development";
import { LineChart } from "@/components/charts/LineChart";

const fmt = (v: number, d = 1) => v.toFixed(d).replace(".", ",");

/** Tek ölçüm varsa grafik yerine tarih; ikinci ölçümle grafik oluşur. */
const OnlyOnce = ({ date }: { date: string }) => <p className="mt-1 text-sm text-muted">{dayLabel(date)} ölçümü · sonraki ölçümle gelişim grafiği oluşur</p>;

/** Gelişim vitrini: ilk günden bugüne ölçüm, testler ve antrenör değerlendirmesi (yönetim, antrenör, veli ortak). */
export function ProgressView({ progress, criteria, audience = "staff" }: { progress: Progress; criteria: string[]; audience?: "staff" | "guardian" }) {
  const m = progress.measurements;
  const heights = m.filter((x) => x.heightCm !== null).map((x) => ({ date: x.measuredOn, value: x.heightCm! }));
  const weights = m.filter((x) => x.weightKg !== null).map((x) => ({ date: x.measuredOn, value: x.weightKg! }));
  const latestEval = progress.evaluations[0];
  const prevEval = progress.evaluations[1];
  const empty = heights.length === 0 && progress.tests.length === 0 && !latestEval;
  if (empty) return <p className="rounded-2xl bg-white p-5 text-muted">{audience === "guardian" ? "Henüz ölçüm yapılmadı. İlk ölçümler yapılınca gelişim burada görünecek." : "Henüz gelişim verisi yok."}</p>;
  return (
    <div className="grid gap-4">
      {latestEval ? (
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Antrenör değerlendirmesi · {dayLabel(latestEval.evaluatedOn)}</h3>
          <ul className="mt-3 grid gap-2">
            {criteria
              .filter((c) => latestEval.scores[c] !== undefined)
              .map((c) => {
                const v = latestEval.scores[c]!;
                const before = prevEval?.scores[c];
                return (
                  <li key={c} className="grid grid-cols-[8rem_1fr_auto] items-center gap-2">
                    <span className="text-ink">{c}</span>
                    <span className="flex gap-1" aria-label={`${v} / 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={["h-3 flex-1 rounded-full", n <= v ? "bg-gs-yellow" : "bg-surface"].join(" ")} />
                      ))}
                    </span>
                    <span className="w-12 text-right text-sm font-bold text-ink">
                      {v}/5
                      {before !== undefined && before !== v ? <span className={before < v ? "text-emerald-700" : "text-red-700"}> {before < v ? "↑" : "↓"}</span> : null}
                    </span>
                  </li>
                );
              })}
          </ul>
          {latestEval.comment ? <p className="mt-4 rounded-2xl bg-gs-yellow-soft p-4 text-[17px] italic text-ink">“{latestEval.comment}”</p> : null}
        </section>
      ) : null}

      {heights.length ? (
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Boy ve kilo</h3>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-bold text-ink">
                Boy {fmt(heights.at(-1)!.value, 0)} cm
                {heights.length > 1 ? <span className="ml-2 text-sm font-semibold text-emerald-700">+{fmt(heights.at(-1)!.value - heights[0]!.value, 0)} cm</span> : null}
              </p>
              {heights.length > 1 ? <LineChart points={heights} unit="cm" decimals={0} label="Boy" /> : <OnlyOnce date={heights[0]!.date} />}
            </div>
            {weights.length ? (
              <div>
                <p className="font-bold text-ink">Kilo {fmt(weights.at(-1)!.value)} kg</p>
                {weights.length > 1 ? <LineChart points={weights} unit="kg" label="Kilo" color="#0f766e" /> : <OnlyOnce date={weights[0]!.date} />}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {progress.tests.length ? (
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Fiziksel testler</h3>
          <ul className="mt-3 grid gap-5 sm:grid-cols-2">
            {progress.tests.map((t) => (
              <li key={t.test.id}>
                <p className="font-bold text-ink">{t.test.name}</p>
                <p className="text-sm text-muted">
                  Son: <span className="font-bold text-ink">{t.latest !== null ? `${fmt(t.latest, t.test.decimals)} ${t.test.unit}` : "—"}</span>
                  {t.change !== null ? (
                    <span className={["ml-2 font-bold", t.improved ? "text-emerald-700" : "text-red-700"].join(" ")}>
                      {t.improved ? "▲ gelişti" : "▼"} ({t.change > 0 ? "+" : ""}
                      {fmt(t.change, t.test.decimals)})
                    </span>
                  ) : null}
                  <span className="ml-1 text-xs">{t.test.higherBetter ? "(yüksek daha iyi)" : "(düşük daha iyi)"}</span>
                </p>
                {t.series.length > 1 ? <LineChart points={t.series} unit={t.test.unit} decimals={t.test.decimals} reference={t.groupAverage} label={t.test.name} /> : t.series[0] ? <OnlyOnce date={t.series[0].date} /> : null}
                {t.groupAverage != null ? (
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <span aria-hidden="true" className="inline-block w-5 border-t border-dashed border-stone-400" />
                    grup ortalaması {fmt(t.groupAverage, t.test.decimals)} {t.test.unit}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
