// Booking wizard step indicator (design-refs/refs.pdf): dots joined by lines,
// completed segments + active dot in peach, the active dot slightly larger.
export function StepperDots({
  total = 3,
  current,
}: {
  total?: number;
  current: number;
}) {
  return (
    <div className="flex items-center justify-center">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <span
              className={`block rounded-full transition-all ${
                active
                  ? 'h-3 w-3 bg-hotel-peach'
                  : done
                    ? 'h-2.5 w-2.5 bg-hotel-peach'
                    : 'h-2.5 w-2.5 bg-hotel-text-muted/40'
              }`}
            />
            {i < total - 1 && (
              <span
                className={`mx-1.5 h-px w-7 ${
                  i < current ? 'bg-hotel-peach' : 'bg-hotel-text-muted/30'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
