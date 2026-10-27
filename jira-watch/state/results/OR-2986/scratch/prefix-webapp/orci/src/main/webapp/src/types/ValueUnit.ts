import { Record, Runtype, String, Boolean } from "runtypes";

export function ValueUnit<T>(innerType: Runtype<T>) {
  return Record({
    value: innerType.nullable(),
    units: String,
    valid: Boolean.optional(),
  });
}
