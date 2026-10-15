export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-32 rounded-lg bg-subtle" />
        <div className="h-4 w-52 rounded bg-subtle" />
      </div>
      <div className="max-w-md mx-auto space-y-4">
        <div className="card-surface p-6 space-y-4">
          <div className="aspect-square w-full rounded-2xl bg-subtle" />
          <div className="h-10 w-full rounded-xl bg-subtle" />
        </div>
        <div className="card-surface p-5 space-y-3">
          <div className="h-5 w-32 rounded-lg bg-subtle" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-subtle" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 rounded bg-subtle" />
                <div className="h-3 w-20 rounded bg-subtle" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
