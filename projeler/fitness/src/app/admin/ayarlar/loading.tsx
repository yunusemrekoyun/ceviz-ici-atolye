export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-28 rounded-lg bg-subtle" />
        <div className="h-4 w-48 rounded bg-subtle" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-surface p-6 space-y-4">
            <div className="h-5 w-36 rounded-lg bg-subtle" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="h-3 w-24 rounded bg-subtle" />
                  <div className="h-10 w-full rounded-xl bg-subtle" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
