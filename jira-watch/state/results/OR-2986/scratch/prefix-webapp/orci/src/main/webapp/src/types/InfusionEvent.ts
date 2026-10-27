import { Literal, Number, Record, Static, String, Union } from "runtypes";

export const InfusionEventType = Union(
  Literal("START"),
  Literal("STOP"),
  Literal("RATE_CHANGE"),
);
export type InfusionEventType = Static<typeof InfusionEventType>;

export const InfusionEvent = Record({
  eventDate: String,
  eventType: InfusionEventType,
  rawAction: String.nullable(),
  rateAmount: Number.nullable(),
  rateUnits: String.nullable(),
  doseUnits: String.nullable(),
  doseAmount: Number.nullable(),
});

export type InfusionEvent = Static<typeof InfusionEvent>;
