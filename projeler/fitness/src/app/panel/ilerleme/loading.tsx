export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-40 rounded-lg bg-subtle" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-surface p-5 space-y-2">
            <div className="h-3 w-20 rounded bg-subtle" />
            <div className="h-8 w-16 rounded-lg bg-subtle" />
          </div>
        ))}
      </div>
      <div className="card-surface p-5 h-64" />
      <div className="card-surface p-5 space-y-3">
        <div className="h-5 w-36 rounded-lg bg-subtle" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 w-full rounded-xl bg-subtle" />
        ))}
      </div>
    </div>
  );
}
