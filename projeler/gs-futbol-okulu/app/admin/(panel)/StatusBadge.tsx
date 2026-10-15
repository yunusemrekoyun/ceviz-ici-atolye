import { isRegistrationStatus, STATUS_BADGE, statusLabel } from "@/lib/registration-status";

export function StatusBadge({ status }: { status: string }) {
  const tone = isRegistrationStatus(status) ? STATUS_BADGE[status] : "bg-gray-100 text-gray-700";
  return <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold ${tone}`}>{statusLabel(status)}</span>;
}
