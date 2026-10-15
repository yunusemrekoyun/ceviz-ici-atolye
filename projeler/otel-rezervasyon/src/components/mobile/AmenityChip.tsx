import type { ElementType } from 'react';

// Cream amenity chip from the Home screen (design-refs/refs.pdf):
// beige background, dark icon + two-line label, horizontal scroll row.
export function AmenityChip({
  icon: Icon,
  label,
}: {
  icon: ElementType;
  label: string;
}) {
  return (
    <div className="flex min-w-[120px] items-center gap-3 rounded-2xl bg-hotel-beige p-4 text-hotel-text-on-beige">
      <Icon size={22} strokeWidth={1.8} className="shrink-0" />
      <span className="font-hotel text-sm font-medium leading-tight">{label}</span>
    </div>
  );
}
