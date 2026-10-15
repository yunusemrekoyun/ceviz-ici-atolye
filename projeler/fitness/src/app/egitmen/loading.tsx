export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-subtle" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-surface p-5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-subtle" />
            <div className="h-7 w-16 rounded bg-subtle" />
            <div className="h-4 w-24 rounded bg-subtle" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {[0,1].map((i) => (
          <div key={i} className="card-surface p-6 space-y-3">
            <div className="h-5 w-40 rounded bg-subtle" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-14 rounded-xl bg-subtle" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
