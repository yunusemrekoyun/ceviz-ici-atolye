export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-40 rounded-lg bg-subtle" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-surface p-5 space-y-4">
          <div className="h-5 w-28 rounded-lg bg-subtle" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-subtle" />
            ))}
          </div>
        </div>
        <div className="card-surface p-5 space-y-4">
          <div className="h-5 w-28 rounded-lg bg-subtle" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-subtle" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
