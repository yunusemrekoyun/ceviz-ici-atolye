export default function AuthLoading() {
  return (
    <div className="w-full max-w-md animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-lg bg-subtle" />
      <div className="h-4 w-64 rounded bg-subtle" />
      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-subtle" />
          <div className="h-11 rounded-xl bg-subtle" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-subtle" />
          <div className="h-11 rounded-xl bg-subtle" />
        </div>
        <div className="h-11 rounded-xl bg-subtle" />
      </div>
    </div>
  );
}
