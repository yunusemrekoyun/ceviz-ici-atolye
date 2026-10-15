export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-subtle" />
      {[0,1].map((i) => (
        <div key={i} className="card-surface p-6 space-y-3">
          <div className="h-5 w-40 rounded bg-subtle" />
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="h-16 rounded-xl bg-subtle" />
          ))}
        </div>
      ))}
    </div>
  );
}
