"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui";
import type { AgeGroupView } from "@/lib/age-groups";
import type { RegistrationDto } from "@/lib/api";
import { ExportDialog } from "../ExportDialog";

/** Forma sayfasının "PDF / Excel"i: öğrencilerdeki dışa aktar penceresi, forma sütunları seçili gelir. */
export function FormaExport({ registrations, groups }: { registrations: RegistrationDto[]; groups: AgeGroupView[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="md" onClick={() => setOpen(true)}>
        <Download className="h-4 w-4" aria-hidden="true" /> PDF / Excel
      </Button>
      {open ? <ExportDialog registrations={registrations} groups={groups} initialStatuses={["enrolled"]} initialGroups={null} onClose={() => setOpen(false)} billing mode="students" preset="forma" /> : null}
    </>
  );
}
