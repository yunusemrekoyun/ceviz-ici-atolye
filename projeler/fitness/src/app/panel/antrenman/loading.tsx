export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-36 rounded-lg bg-subtle" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-surface p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-40 rounded-lg bg-subtle" />
              <div className="h-6 w-20 rounded-full bg-subtle" />
            </div>
            <div className="h-3 w-32 rounded bg-subtle" />
            <div className="flex gap-2">
              <div className="h-8 w-24 rounded-lg bg-subtle" />
              <div className="h-8 w-24 rounded-lg bg-subtle" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
