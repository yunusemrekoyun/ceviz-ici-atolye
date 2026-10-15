export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded-lg bg-subtle" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-surface p-5 space-y-3">
            <div className="h-5 w-3/4 rounded bg-subtle" />
            <div className="h-4 w-1/2 rounded bg-subtle" />
            <div className="h-3 w-2/3 rounded bg-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}
