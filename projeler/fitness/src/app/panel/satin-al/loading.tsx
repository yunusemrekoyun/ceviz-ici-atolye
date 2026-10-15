export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-lg bg-subtle" />
        <div className="h-4 w-56 rounded bg-subtle" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card-surface p-6 space-y-4">
            <div className="h-5 w-28 rounded-lg bg-subtle" />
            <div className="h-9 w-20 rounded-lg bg-subtle" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-3 w-full rounded bg-subtle" />
              ))}
            </div>
            <div className="h-10 w-full rounded-xl bg-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}
