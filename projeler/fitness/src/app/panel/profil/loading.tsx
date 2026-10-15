export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-28 rounded-lg bg-subtle" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-surface p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-subtle" />
            <div className="space-y-2">
              <div className="h-5 w-32 rounded-lg bg-subtle" />
              <div className="h-3 w-24 rounded bg-subtle" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-3 w-full rounded bg-subtle" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 card-surface p-6 space-y-4">
          <div className="h-5 w-36 rounded-lg bg-subtle" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 rounded bg-subtle" />
                <div className="h-10 w-full rounded-xl bg-subtle" />
              </div>
            ))}
          </div>
          <div className="h-10 w-32 rounded-xl bg-subtle mt-2" />
        </div>
      </div>
    </div>
  );
}
