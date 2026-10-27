/**
 * HL7 v2 messages use a carriage return as the segment separator, so a raw message arrives as one
 * unreadable line. Split it into its segments (one per displayed line) and drop blank lines, without
 * touching the field separators within a segment.
 */
export function formatHl7Segments(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(/\r\n|\r|\n/)
    .map((segment) => segment.trimEnd())
    .filter((segment) => segment.length > 0);
}

/**
 * Split a single segment into its leading segment id (e.g. "MSH", "PID") and the remainder, so the id
 * can be emphasized when rendered. Returns the whole segment as the id when there is no field separator.
 */
export function splitSegmentId(segment: string): {
  id: string;
  rest: string;
} {
  const separatorIndex = segment.indexOf("|");
  if (separatorIndex === -1) return { id: segment, rest: "" };
  return {
    id: segment.slice(0, separatorIndex),
    rest: segment.slice(separatorIndex),
  };
}
