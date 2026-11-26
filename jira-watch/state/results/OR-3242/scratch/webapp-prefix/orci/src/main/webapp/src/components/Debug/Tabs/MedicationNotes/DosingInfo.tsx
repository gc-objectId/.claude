import React from "react";
import { Stack } from "react-bootstrap";
import type { MedicationNoteDto } from "@api";

interface DosingInfoProps {
  note: MedicationNoteDto;
}

export function DosingInfo({ note }: DosingInfoProps) {
  const hasDosingInfo =
    note.doseQuantity ||
    note.doseRate ||
    note.doseTimingFrequency ||
    note.doseTimingPeriod ||
    note.doseTimingText ||
    note.asNeeded;

  if (!hasDosingInfo) {
    return <span className="text-secondary">—</span>;
  }

  return (
    <Stack direction="vertical" gap={1}>
      {note.doseQuantity && (
        <div>
          <span className="guided-tag me-1">Quantity</span>
          <small>{note.doseQuantity}</small>
        </div>
      )}

      {note.doseRate && (
        <div>
          <span className="guided-tag me-1">Rate</span>
          <small>{note.doseRate}</small>
        </div>
      )}

      {(note.doseTimingFrequency ||
        note.doseTimingPeriod ||
        note.doseTimingText) && (
        <div>
          <span className="guided-tag me-1">Timing</span>
          <small>
            {note.doseTimingFrequency && `${note.doseTimingFrequency}x`}
            {note.doseTimingFrequency && note.doseTimingPeriod && " per "}
            {note.doseTimingPeriod}
            {note.doseTimingText && ` (${note.doseTimingText})`}
          </small>
        </div>
      )}

      {note.asNeeded && (
        <div>
          <span className="guided-tag">PRN</span>
        </div>
      )}
    </Stack>
  );
}
