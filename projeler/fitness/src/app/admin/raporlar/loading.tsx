export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-28 rounded-lg bg-subtle" />
        <div className="h-4 w-52 rounded bg-subtle" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-surface p-5 space-y-3">
            <div className="h-3 w-20 rounded bg-subtle" />
            <div className="h-8 w-24 rounded-lg bg-subtle" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-surface p-5 h-64" />
        <div className="card-surface p-5 h-64" />
      </div>
    </div>
  );
}
