/** Current time as an HL7 timestamp string (YYYYMMDDHHmmss). */
export function hl7Now(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0"),
  ].join("");
}

/** Random 6-digit message control ID. */
export function hl7ControlId(): string {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

/** Pad from field N to field M with empty fields, returning the separator string. */
function padFields(from: number, to: number): string {
  return "|".repeat(to - from);
}

export type FieldType = "text" | "select" | "observation-list";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  /** Called once on first template selection to supply the initial value. */
  defaultValue: () => string;
  placeholder?: string;
  required?: boolean;
  inputSubtype?: "timestamp";
  /** Options for 'select' type. */
  options?: string[];
}

/** A single OBX row in a flowsheet message. */
export interface ObservationRow {
  code: string;
  name: string;
  value: string;
  units: string;
}

/** Known MA451 flowsheet observation types. */
export const FLOWSHEET_OBSERVATIONS: ReadonlyArray<
  Omit<ObservationRow, "value">
> = [
  { code: "14046729", name: "Heart rate", units: "bpm" },
  { code: "14032023", name: "Pulse", units: "bpm" },
  { code: "14032039", name: "SpO2", units: "%" },
  { code: "14032053", name: "Glucose", units: "mg/dL" },
  { code: "950182", name: "EBL", units: "mL" },
  { code: "14080057", name: "Blood transfusion (PRBC)", units: "mL" },
  { code: "14080024", name: "Blood transfusion (FFP)", units: "mL" },
  { code: "14080033", name: "Blood transfusion (Platelets)", units: "mL" },
  { code: "14079498", name: "Blood transfusion (Cryo)", units: "mL" },
  { code: "14080020", name: "Blood transfusion (Whole)", units: "mL" },
];

const DEFAULT_FLOWSHEET_OBSERVATIONS: ObservationRow[] = [
  { code: "14046729", name: "Heart rate", value: "72", units: "bpm" },
  { code: "14032039", name: "SpO2", value: "98", units: "%" },
  { code: "14032053", name: "Glucose", value: "100", units: "mg/dL" },
];

export interface MessageTemplate {
  key: string;
  name: string;
  fields: TemplateField[];
  /** Builds the raw HL7 message from field values. Segments are joined with CR (\r). */
  build: (values: Record<string, string>) => string;
}

// ============================================================
// Shared fields reused across templates
// ============================================================

const orderIdField: TemplateField = {
  key: "orderId",
  label: "Order ID (ORC-2)",
  type: "text",
  defaultValue: () => "",
  placeholder: "e.g. ORD-12345",
  required: true,
};

const giveSubIdCounterField: TemplateField = {
  key: "giveSubIdCounter",
  label: "Give Sub-ID Counter (RXA-1)",
  type: "text",
  defaultValue: () => "0",
  placeholder: "e.g. 0",
};

const adminSubIdCounterField: TemplateField = {
  key: "adminSubIdCounter",
  label: "Admin Sub-ID Counter (RXA-2)",
  type: "text",
  defaultValue: () => "1",
  placeholder: "e.g. 1",
};

const sendingFacilityField: TemplateField = {
  key: "sendingFacility",
  label: "Sending Facility",
  type: "select",
  defaultValue: () => "ROSMC",
  options: ["ROSMC", "RORMC", "DEMO"],
};

const patientMrnField: TemplateField = {
  key: "patientMrn",
  label: "Patient MRN",
  type: "text",
  defaultValue: () => "11800621",
};

const patientNameField: TemplateField = {
  key: "patientName",
  label: "Patient Name",
  type: "text",
  defaultValue: () => "TEST^PATIENT",
  placeholder: "FAMILY^GIVEN",
};

const messageTimestampField: TemplateField = {
  key: "messageTimestamp",
  label: "Message Timestamp",
  type: "text",
  defaultValue: hl7Now,
  placeholder: "YYYYMMDDHHmmss",
  inputSubtype: "timestamp",
};

const messageControlIdField: TemplateField = {
  key: "messageControlId",
  label: "Message Control ID",
  type: "text",
  defaultValue: hl7ControlId,
};

// AIL-3-2, the full location resource name Epic sends. The SIU processor reads only this to
// identify the OR; a message without it is treated as a non-surgical case and skipped.
const orLocationField: TemplateField = {
  key: "orLocation",
  label: "OR Location (AIL-3-2)",
  type: "text",
  defaultValue: () => "RM OR 49 ROEI 01 303",
  placeholder: "e.g. RM OR 49 ROEI 01 303",
  required: true,
};

// ============================================================
// MSH builder
// ============================================================

/** Build an MSH segment. MSH-2 encoding chars are ^~\& per HL7 spec. */
function msh(
  sendingApp: string,
  sendingFacility: string,
  messageType: string,
  messageTimestamp: string,
  messageControlId: string,
  msh6 = "",
): string {
  // MSH|^~\&|sendingApp|sendingFacility|RST|msh6|timestamp||messageType|controlId|P|2.5.1
  return `MSH|^~\\&|${sendingApp}|${sendingFacility}|RST|${msh6}|${messageTimestamp}||${messageType}|${messageControlId}|P|2.5.1`;
}

// ============================================================
// Templates
// ============================================================

export const TEMPLATES: MessageTemplate[] = [
  // ──────────────────────────────────────────────────────────
  // ORU^R01 — Flowsheet (vital signs)
  // ──────────────────────────────────────────────────────────
  {
    key: "oru-flowsheet",
    name: "ORU^R01 — Flowsheet",
    fields: [
      sendingFacilityField,
      patientMrnField,
      { ...patientNameField, defaultValue: () => "TESTFLOW^PATIENT" },
      messageTimestampField,
      messageControlIdField,
      {
        key: "observationDateTime",
        label: "Observation Time",
        type: "text",
        defaultValue: hl7Now,
        placeholder: "YYYYMMDDHHmmss",
        inputSubtype: "timestamp",
      },
      {
        key: "observations",
        label: "Observations",
        type: "observation-list",
        defaultValue: () => JSON.stringify(DEFAULT_FLOWSHEET_OBSERVATIONS),
      },
    ],
    build: (v) => {
      let rows: ObservationRow[] = [];
      try {
        rows = JSON.parse(v.observations ?? "[]");
      } catch {
        // malformed JSON — send no OBX segments
      }
      return [
        msh(
          "EPIC^ORU_FLOWSHEET",
          v.sendingFacility,
          "ORU^R01",
          v.messageTimestamp,
          v.messageControlId,
        ),
        `PID|1||${v.patientMrn}^^^MC^MC||${v.patientName}`,
        `OBR|1|||FLOWSHEET^Flowsheet^MA451||${v.observationDateTime}|${v.observationDateTime}`,
        ...rows.map(
          (obs, i) =>
            `OBX|${i + 1}|NM|${obs.code}^${obs.name}^MA451||${obs.value}|${
              obs.units
            }|||||F|||${v.observationDateTime}`,
        ),
      ].join("\r");
    },
  },

  // ──────────────────────────────────────────────────────────
  // ORU^R01 — Lab Result
  // ──────────────────────────────────────────────────────────
  {
    key: "oru-lab",
    name: "ORU^R01 — Lab Result",
    fields: [
      sendingFacilityField,
      { ...patientMrnField, defaultValue: () => "11291855" },
      patientNameField,
      messageTimestampField,
      messageControlIdField,
      {
        key: "orderNumber",
        label: "Order Number",
        type: "text",
        defaultValue: () => "2222006537777",
      },
      {
        key: "loincCode",
        label: "LOINC Code",
        type: "text",
        defaultValue: () => "883-9",
        placeholder: "e.g. 883-9",
      },
      {
        key: "observationName",
        label: "Observation Name",
        type: "text",
        defaultValue: () => "ABO Group",
      },
      {
        key: "observationValue",
        label: "Value",
        type: "text",
        defaultValue: () => "O",
      },
      {
        key: "observationDateTime",
        label: "Observation Time",
        type: "text",
        defaultValue: hl7Now,
        placeholder: "YYYYMMDDHHmmss",
        inputSubtype: "timestamp",
      },
    ],
    build: (v) =>
      [
        msh(
          "EPIC^ORU_LAB_RESULTS",
          v.sendingFacility,
          "ORU^R01",
          v.messageTimestamp,
          v.messageControlId,
        ),
        `PID|1||${v.patientMrn}^^^MC^MC||${v.patientName}`,
        `OBR|1|${v.orderNumber}|${v.orderNumber}|LAB^Lab Results||${v.observationDateTime}`,
        `OBX|1|ST|${v.loincCode}^${v.observationName}^LN||${v.observationValue}||||||C|||${v.observationDateTime}`,
      ].join("\r"),
  },

  // ──────────────────────────────────────────────────────────
  // RAS^O17 — Bolus
  // ──────────────────────────────────────────────────────────
  {
    key: "ras-bolus",
    name: "RAS^O17 — Bolus",
    fields: [
      sendingFacilityField,
      { ...patientMrnField, defaultValue: () => "11269948" },
      patientNameField,
      messageTimestampField,
      messageControlIdField,
      orderIdField,
      {
        key: "adminDateTime",
        label: "Administration Time",
        type: "text",
        defaultValue: hl7Now,
        placeholder: "YYYYMMDDHHmmss",
        inputSubtype: "timestamp",
      },
      giveSubIdCounterField,
      adminSubIdCounterField,
      {
        key: "ndcCode",
        label: "NDC Code",
        type: "text",
        defaultValue: () => "0409-4887-10",
        placeholder: "e.g. 0409-4887-10",
      },
      {
        key: "medicationName",
        label: "Medication Name",
        type: "text",
        defaultValue: () => "NaCl 0.9%",
      },
      { key: "dose", label: "Dose", type: "text", defaultValue: () => "100" },
      {
        key: "units",
        label: "Units",
        type: "text",
        defaultValue: () => "mL",
        placeholder: "e.g. mL, mg (discrete units = bolus)",
      },
      { key: "route", label: "Route", type: "text", defaultValue: () => "IV" },
      {
        key: "completionStatus",
        label: "Completion Status",
        type: "select",
        defaultValue: () => "Given",
        options: ["Given", "NewBag", "RateChange", "Stopped", "Canceled"],
      },
    ],
    build: (v) =>
      [
        msh(
          "EPIC^RAS_GENERIC",
          v.sendingFacility,
          "RAS^O17",
          v.messageTimestamp,
          v.messageControlId,
        ),
        `PID|||${v.patientMrn}^^^MC^MC||${v.patientName}`,
        `ORC|RE|${v.orderId}^EPC`,
        // RXA-1=giveSubId, 2=adminSubId, 3=adminDateTime, 4=empty, 5=code, 6=dose, 7=units, 8-19=empty, 20=status
        `RXA|${v.giveSubIdCounter}|${v.adminSubIdCounter}|${v.adminDateTime}||${
          v.ndcCode
        }^${v.medicationName}^NDC|${v.dose}|${v.units}${padFields(7, 19)}|${
          v.completionStatus
        }`,
        `RXR|${v.route}`,
      ].join("\r"),
  },

  // ──────────────────────────────────────────────────────────
  // RAS^O17 — Infusion
  // ──────────────────────────────────────────────────────────
  {
    key: "ras-infusion",
    name: "RAS^O17 — Infusion",
    fields: [
      sendingFacilityField,
      { ...patientMrnField, defaultValue: () => "11292542" },
      patientNameField,
      messageTimestampField,
      messageControlIdField,
      orderIdField,
      {
        key: "adminDateTime",
        label: "Administration Time",
        type: "text",
        defaultValue: hl7Now,
        placeholder: "YYYYMMDDHHmmss",
        inputSubtype: "timestamp",
      },
      giveSubIdCounterField,
      adminSubIdCounterField,
      {
        key: "ndcCode",
        label: "NDC Code",
        type: "text",
        defaultValue: () => "00409-4699-24",
        placeholder: "e.g. 00409-4699-24",
      },
      {
        key: "medicationName",
        label: "Medication Name",
        type: "text",
        defaultValue: () => "propofol 10 mg/mL infusion",
      },
      { key: "dose", label: "Rate", type: "text", defaultValue: () => "50" },
      {
        key: "units",
        label: "Units",
        type: "text",
        defaultValue: () => "mcg/kg/min",
        placeholder: "e.g. mcg/kg/min, mL/hr (rate units = infusion)",
      },
      { key: "route", label: "Route", type: "text", defaultValue: () => "IV" },
      {
        key: "completionStatus",
        label: "Completion Status",
        type: "select",
        defaultValue: () => "NewBag",
        options: ["Given", "NewBag", "RateChange", "Stopped", "Canceled"],
      },
    ],
    build: (v) =>
      [
        msh(
          "EPIC^RAS_NDC",
          v.sendingFacility,
          "RAS^O17",
          v.messageTimestamp,
          v.messageControlId,
        ),
        `PID|||${v.patientMrn}^^^MC^MC||${v.patientName}`,
        `ORC|RE|${v.orderId}^EPC`,
        `RXA|${v.giveSubIdCounter}|${v.adminSubIdCounter}|${v.adminDateTime}||${
          v.ndcCode
        }^${v.medicationName}^NDC|${v.dose}|${v.units}${padFields(7, 19)}|${
          v.completionStatus
        }`,
        `RXR|${v.route}`,
      ].join("\r"),
  },

  // ──────────────────────────────────────────────────────────
  // SIU^S14 — Case Create (BEFORE)
  // ──────────────────────────────────────────────────────────
  {
    key: "siu-case-create",
    name: "SIU^S14 — Case Create",
    fields: [
      sendingFacilityField,
      { ...patientMrnField, defaultValue: () => "11201809" },
      patientNameField,
      messageTimestampField,
      messageControlIdField,
      {
        key: "caseId",
        label: "Case ID",
        type: "text",
        defaultValue: () => "183820",
      },
      {
        key: "caseStartTime",
        label: "Case Start Time",
        type: "text",
        defaultValue: hl7Now,
        placeholder: "YYYYMMDDHHmmss",
        inputSubtype: "timestamp",
      },
      {
        key: "caseEndTime",
        label: "Case End Time",
        type: "text",
        defaultValue: hl7Now,
        placeholder: "YYYYMMDDHHmmss",
        inputSubtype: "timestamp",
      },
      {
        key: "orRoom",
        label: "OR Room (OBX)",
        type: "text",
        defaultValue: () => "OR 49",
      },
      orLocationField,
      {
        key: "procedureCode",
        label: "Procedure Code",
        type: "text",
        defaultValue: () => "1758",
      },
      {
        key: "procedureName",
        label: "Procedure Name",
        type: "text",
        defaultValue: () => "APPENDECTOMY",
      },
    ],
    build: (v) =>
      [
        msh(
          "EPIC^SIU_SURGICAL_UDP",
          v.sendingFacility,
          "SIU^S14^SIU_S12",
          v.messageTimestamp,
          v.messageControlId,
          "OR_CASE_FILE",
        ),
        `SCH||${v.caseId}`,
        `ZCS|BEFORE|N|ORSCH_S14`,
        `PID|1||${v.patientMrn}^^^MC^MC||${v.patientName}`,
        `PV1||OS`,
        `OBX|1|ST|SchedulingStatus|4|Scheduled||||||F`,
        `OBX|2|ST|OR_ROOM|8|${v.orRoom}||||||F`,
        `OBX|3|TS|CASE_START_TIME|3|${v.caseStartTime}||||||F`,
        `OBX|4|TS|CASE_END_TIME|2|${v.caseEndTime}||||||F`,
        `RGS|1||1`,
        `AIS|1||${v.procedureCode}^${v.procedureName}`,
        `AIL|1||^${v.orLocation}^^ROEIOR`,
      ].join("\r"),
  },

  // ──────────────────────────────────────────────────────────
  // SIU^S14 — Timing Event (AFTER)
  // ──────────────────────────────────────────────────────────
  {
    key: "siu-timing-event",
    name: "SIU^S14 — Timing Event",
    fields: [
      sendingFacilityField,
      { ...patientMrnField, defaultValue: () => "11264348" },
      patientNameField,
      messageTimestampField,
      messageControlIdField,
      {
        key: "caseId",
        label: "Case ID",
        type: "text",
        defaultValue: () => "181539",
      },
      orLocationField,
      {
        key: "timingEvent",
        label: "Timing Event",
        type: "select",
        defaultValue: () => "In Room",
        options: [
          "In Room",
          "Anes Start",
          "Induction",
          "Procedure Start",
          "Procedure Finish",
          "Anes Stop",
          "Out Room",
        ],
      },
      {
        key: "eventTimestamp",
        label: "Event Timestamp",
        type: "text",
        defaultValue: hl7Now,
        placeholder: "YYYYMMDDHHmmss",
        inputSubtype: "timestamp",
      },
    ],
    build: (v) =>
      [
        msh(
          "EPIC^SIU_SURGICAL_UDP",
          v.sendingFacility,
          "SIU^S14^SIU_S12",
          v.messageTimestamp,
          v.messageControlId,
          "OR_TIMING_EVENT",
        ),
        `SCH||${v.caseId}`,
        `ZCS|AFTER|N|ORSCH_S14^${v.timingEvent}`,
        `PID|1||${v.patientMrn}^^^MC^MC||${v.patientName}`,
        `OBX|1|DTM|${v.timingEvent}|In|${v.eventTimestamp}||||||F`,
        `AIL|1||^${v.orLocation}^^ROEIOR`,
      ].join("\r"),
  },
];
