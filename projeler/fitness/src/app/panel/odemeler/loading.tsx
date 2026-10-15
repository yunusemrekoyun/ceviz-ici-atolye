export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-36 rounded-lg bg-subtle" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card-surface p-5 space-y-2">
            <div className="h-3 w-24 rounded bg-subtle" />
            <div className="h-8 w-20 rounded-lg bg-subtle" />
          </div>
        ))}
      </div>
      <div className="card-surface overflow-hidden">
        <div className="p-5 border-b border-subtle">
          <div className="h-5 w-32 rounded-lg bg-subtle" />
        </div>
        <div className="divide-y divide-white/5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-subtle" />
                <div className="h-3 w-20 rounded bg-subtle" />
              </div>
              <div className="h-5 w-20 rounded bg-subtle" />
              <div className="h-6 w-16 rounded-full bg-subtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
