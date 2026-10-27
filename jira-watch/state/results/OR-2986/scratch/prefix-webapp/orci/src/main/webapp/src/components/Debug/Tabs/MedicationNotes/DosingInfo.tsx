import React from "react";
import { Badge, Stack } from "react-bootstrap";
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
    return <span className="text-muted">—</span>;
  }

  return (
    <Stack direction="vertical" gap={1}>
      {note.doseQuantity && (
        <div>
          <Badge bg="primary" className="me-1">
            Quantity
          </Badge>
          <small>{note.doseQuantity}</small>
        </div>
      )}

      {note.doseRate && (
        <div>
          <Badge bg="info" className="me-1">
            Rate
          </Badge>
          <small>{note.doseRate}</small>
        </div>
      )}

      {(note.doseTimingFrequency ||
        note.doseTimingPeriod ||
        note.doseTimingText) && (
        <div>
          <Badge bg="secondary" className="me-1">
            Timing
          </Badge>
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
          <Badge bg="warning" text="dark">
            PRN
          </Badge>
        </div>
      )}
    </Stack>
  );
}
