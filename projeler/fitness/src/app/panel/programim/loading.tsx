export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-44 rounded-lg bg-subtle" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card-surface p-5 space-y-4">
            <div className="flex justify-between">
              <div className="h-5 w-40 rounded-lg bg-subtle" />
              <div className="h-6 w-20 rounded-full bg-subtle" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 py-2 border-b border-subtle">
                  <div className="h-4 w-32 rounded bg-subtle" />
                  <div className="h-4 w-16 rounded bg-subtle ml-auto" />
                  <div className="h-4 w-16 rounded bg-subtle" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
