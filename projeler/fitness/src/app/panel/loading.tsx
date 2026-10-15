export default function PanelLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-subtle" />
          <div className="h-7 w-40 rounded-lg bg-subtle" />
        </div>
        <div className="w-12 h-12 rounded-2xl bg-subtle" />
      </div>

      {/* Hero card */}
      <div className="rounded-3xl border border-subtle bg-subtle p-6 md:p-8 h-40" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-surface p-5 space-y-2">
            <div className="h-3 w-24 rounded bg-subtle" />
            <div className="h-8 w-20 rounded-lg bg-subtle" />
          </div>
        ))}
      </div>

      {/* Content card */}
      <div className="card-surface p-6 space-y-3">
        <div className="h-5 w-32 rounded-lg bg-subtle" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between py-2 border-b border-subtle">
            <div className="h-4 w-28 rounded bg-subtle" />
            <div className="h-4 w-16 rounded bg-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}
