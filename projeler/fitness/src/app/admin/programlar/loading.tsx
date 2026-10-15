export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-52 rounded-lg bg-subtle" />
          <div className="h-4 w-60 rounded bg-subtle" />
        </div>
        <div className="h-9 w-36 rounded-xl bg-subtle" />
      </div>
      <div className="card-surface overflow-hidden">
        <div className="p-4 border-b border-subtle">
          <div className="h-5 w-36 rounded-lg bg-subtle" />
        </div>
        <div className="divide-y divide-white/5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-subtle shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-subtle" />
                <div className="h-3 w-24 rounded bg-subtle" />
              </div>
              <div className="h-6 w-16 rounded-full bg-subtle" />
              <div className="h-8 w-20 rounded-lg bg-subtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
