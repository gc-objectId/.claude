import { Literal, Static, Union } from "runtypes";

export const MedicationRoute = Union(
  Literal("ENDOTRACHEAL"),
  Literal("EPIDURAL"),
  Literal("GASTRIC_TUBE"),
  Literal("GASTROSTOMY_TUBE"),
  Literal("INFILTRATION"),
  Literal("INHALATION"),
  Literal("INJECTION"),
  Literal("INTRAARTERIAL"),
  Literal("INTRAMUSCULAR"),
  Literal("INTRANASAL"),
  Literal("INTRAOCULAR"),
  Literal("INTRAOSSEOUS"),
  Literal("INTRASPINAL"),
  Literal("INTRATHECAL"),
  Literal("INTRAVENOUS"),
  Literal("NASAL"),
  Literal("NEBULIZATION"),

  Literal("NERVE_BLOCK"),
  Literal("ORAL"),
  Literal("RECTAL"),
  Literal("SPINAL"),

  Literal("SUBCUTANEOUS"),
  Literal("SUBLINGUAL"),
  Literal("TOPICAL"),
  Literal("TRANSDERMAL"),
  Literal("TRANSLINGUAL"),
  Literal("UNKNOWN"),
);

// Helper function to convert enum values to display labels
export function getMedicationRouteLabel(route: MedicationRoute): string {
  const labels: Record<MedicationRoute, string> = {
    ENDOTRACHEAL: "Endotracheal",
    EPIDURAL: "Epidural",
    GASTRIC_TUBE: "Gastric Tube",
    GASTROSTOMY_TUBE: "G-tube",
    INFILTRATION: "Infiltration",
    INHALATION: "Inhalation",
    INJECTION: "Injection",
    INTRAARTERIAL: "Intraarterial",
    INTRAMUSCULAR: "IM",
    INTRANASAL: "Intranasal",
    INTRAOCULAR: "Intraocular",
    INTRAOSSEOUS: "IO",
    INTRASPINAL: "Intraspinal",
    INTRATHECAL: "Intrathecal",
    INTRAVENOUS: "IV",
    NASAL: "Nasal",
    NEBULIZATION: "Nebulization",
    NERVE_BLOCK: "Block",
    ORAL: "PO",
    RECTAL: "Rectal",
    SPINAL: "Spinal",
    SUBCUTANEOUS: "Subcutaneous",
    SUBLINGUAL: "Sublingual",
    TOPICAL: "Topical",
    TRANSDERMAL: "Transdermal",
    TRANSLINGUAL: "Translingual",
    UNKNOWN: "Unknown",
  };

  return labels[route];
}

export type MedicationRoute = Static<typeof MedicationRoute>;
