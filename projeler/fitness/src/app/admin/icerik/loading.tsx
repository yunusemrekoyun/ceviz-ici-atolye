export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-lg bg-subtle" />
        <div className="h-4 w-64 rounded bg-subtle" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-xl bg-subtle" />
        ))}
      </div>
      <div className="card-surface overflow-hidden">
        <div className="p-4 border-b border-subtle flex justify-between">
          <div className="h-5 w-28 rounded-lg bg-subtle" />
          <div className="h-8 w-28 rounded-lg bg-subtle" />
        </div>
        <div className="divide-y divide-white/5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-12 h-12 rounded-xl bg-subtle shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-subtle" />
                <div className="h-3 w-32 rounded bg-subtle" />
              </div>
              <div className="h-6 w-16 rounded-full bg-subtle" />
              <div className="h-8 w-16 rounded-lg bg-subtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
