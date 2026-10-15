export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-24 rounded-lg bg-subtle" />
          <div className="h-4 w-44 rounded bg-subtle" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-subtle" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-surface p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-32 rounded-lg bg-subtle" />
              <div className="h-6 w-14 rounded-full bg-subtle" />
            </div>
            <div className="h-3 w-40 rounded bg-subtle" />
            <div className="h-3 w-28 rounded bg-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}
