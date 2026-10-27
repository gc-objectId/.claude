import {
  Array,
  Boolean,
  InstanceOf,
  Number,
  Record,
  Static,
  String,
} from "runtypes";
import { CaseID, OperationUUID } from "./identifiers";
import { ValueUnit } from "./ValueUnit";
import { Procedure } from "./Procedure";

export const Operation = Record({
  operationId: OperationUUID,
  caseId: CaseID,
  startTime: String.nullable(),
  endTime: String.nullable(),
  admissionDate: String.nullable(),
  initialApplicationLaunchTime: String,
  baselineMAP: ValueUnit(Number).nullable(),
  procedureTypes: Array(Procedure),
  acuity: String.nullable(),
  asaStatus: String.nullable(),
  inductionStartTime: String.nullable(),
  primaryPractitionerName: String.nullable(),
});

export type Operation = Static<typeof Operation>;
