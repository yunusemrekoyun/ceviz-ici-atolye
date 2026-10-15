export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-lg bg-subtle" />
          <div className="h-4 w-48 rounded bg-subtle" />
        </div>
        <div className="h-9 w-36 rounded-xl bg-subtle" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-surface p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-subtle" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-subtle" />
                <div className="h-3 w-20 rounded bg-subtle" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-subtle" />
              <div className="h-3 w-3/4 rounded bg-subtle" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
