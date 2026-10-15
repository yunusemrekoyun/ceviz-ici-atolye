export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-subtle" />
          <div className="h-4 w-72 rounded-lg bg-subtle" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-subtle" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-surface p-5 space-y-3">
            <div className="h-3 w-20 rounded bg-subtle" />
            <div className="h-8 w-24 rounded-lg bg-subtle" />
            <div className="h-3 w-16 rounded bg-subtle" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card-surface overflow-hidden">
        <div className="p-5 border-b border-subtle">
          <div className="h-5 w-32 rounded-lg bg-subtle" />
        </div>
        <div className="divide-y divide-white/5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-subtle shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-subtle" />
                <div className="h-3 w-24 rounded bg-subtle" />
              </div>
              <div className="h-6 w-16 rounded-full bg-subtle" />
              <div className="h-4 w-20 rounded bg-subtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
