export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded-lg bg-subtle" />
      <div className="card-surface divide-y divide-subtle">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <div className="w-9 h-9 rounded-xl bg-subtle shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 rounded bg-subtle" />
              <div className="h-3 w-48 rounded bg-subtle" />
            </div>
            <div className="hidden sm:flex flex-col gap-2 items-end">
              <div className="h-5 w-20 rounded-full bg-subtle" />
              <div className="h-3 w-28 rounded bg-subtle" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
