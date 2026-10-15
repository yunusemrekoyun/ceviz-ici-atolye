export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-lg bg-subtle" />
          <div className="h-4 w-52 rounded bg-subtle" />
        </div>
        <div className="h-9 w-32 rounded-xl bg-subtle" />
      </div>
      <div className="card-surface overflow-hidden">
        <div className="p-4 border-b border-subtle flex gap-3">
          <div className="h-9 w-32 rounded-xl bg-subtle" />
          <div className="h-9 w-28 rounded-xl bg-subtle" />
        </div>
        <div className="divide-y divide-white/5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 rounded bg-subtle" />
                <div className="h-3 w-24 rounded bg-subtle" />
              </div>
              <div className="h-4 w-28 rounded bg-subtle" />
              <div className="h-4 w-20 rounded bg-subtle" />
              <div className="h-6 w-18 rounded-full bg-subtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
