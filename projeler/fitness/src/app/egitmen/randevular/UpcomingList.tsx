"use client";

import { useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { CancelBtn } from "./CancelBtn";

type Appt = {
  id: string;
  startAt: string;
  endAt: string;
  notes: string | null;
  memberName: string;
  memberPhone: string | null;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    weekday: "short", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  });
}

export function UpcomingList({ appointments }: { appointments: Appt[] }) {
  const [list, setList] = useState(appointments);

  function handleCancelled(id: string) {
    setList((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="card-surface p-6">
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-neon" /> Yaklaşan Randevular
      </h2>
      {list.length === 0 ? (
        <div className="text-center py-10 text-muted text-sm">Yaklaşan randevu yok.</div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl bg-subtle border border-subtle">
              <div className="w-10 h-10 rounded-xl bg-neon/10 grid place-items-center shrink-0">
                <Calendar className="w-5 h-5 text-neon" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{a.memberName}</div>
                <div className="text-sm text-muted">{fmt(a.startAt)}</div>
                {a.memberPhone && (
                  <div className="text-xs text-faint">{a.memberPhone}</div>
                )}
                {a.notes && (
                  <div className="text-xs text-muted mt-0.5 truncate max-w-xs">{a.notes}</div>
                )}
              </div>
              <CancelBtn
                appointmentId={a.id}
                memberName={a.memberName}
                dateLabel={fmt(a.startAt)}
                onCancelled={handleCancelled}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
