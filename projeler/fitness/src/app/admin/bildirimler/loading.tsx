export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-lg bg-subtle" />
          <div className="h-4 w-52 rounded bg-subtle" />
        </div>
        <div className="h-9 w-40 rounded-xl bg-subtle" />
      </div>
      <div className="card-surface overflow-hidden">
        <div className="divide-y divide-white/5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-subtle shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-subtle" />
                <div className="h-3 w-64 rounded bg-subtle" />
                <div className="h-3 w-20 rounded bg-subtle" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
