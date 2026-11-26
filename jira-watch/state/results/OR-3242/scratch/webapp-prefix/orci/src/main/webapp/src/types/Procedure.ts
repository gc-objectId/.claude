import {
  Array,
  Boolean,
  InstanceOf,
  Number,
  Record,
  Static,
  String,
} from "runtypes";
import { CaseID } from "./identifiers";
import { ValueUnit } from "./ValueUnit";

export const Procedure = Record({
  procedureId: String,
  procedureName: String,
  qualifier: String.nullable().optional(),
});

export type Procedure = Static<typeof Procedure>;
