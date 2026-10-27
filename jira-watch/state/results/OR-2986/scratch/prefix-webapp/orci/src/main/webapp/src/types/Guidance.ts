import {
  Array,
  Dictionary,
  Lazy,
  Literal,
  Record,
  Runtype,
  Static,
  String,
  Union,
  Unknown,
} from "runtypes";
import { Citation } from "./Citation";
import { CitationsLocation } from "./CitationsLocation";
import { DoseOption } from "./DoseOption";
import { AlertDefinition } from "./AlertDefinition";
import { BannerDefinition } from "./BannerDefinition";

export const SetDefaultDose = Record({
  type: Literal("SET_DEFAULT_DOSE"),
  defaultDose: DoseOption,
});
export type SetDefaultDose = Static<typeof SetDefaultDose>;

export const ShowAlert = Record({
  type: Literal("SHOW_ALERT"),
  alertDefinition: AlertDefinition,
});
export type ShowAlert = Static<typeof ShowAlert>;

export const ShowBanner = Record({
  type: Literal("SHOW_BANNER"),
  bannerDefinition: BannerDefinition,
});

export type ShowBanner = Static<typeof ShowBanner>;

export const MaxDose = Record({
  maxDose: Unknown,
  allowableOverage: Unknown,
});

export type MaxDose = Static<typeof MaxDose>;

export const SetMaxDose = Record({
  type: Literal("SET_MAX_DOSE"),
  maxDose: MaxDose,
});

export type SetMaxDose = Static<typeof SetMaxDose>;

export const SetDoseOptions = Record({
  type: Literal("SET_DOSE_OPTIONS"),
  doseOptions: Array(DoseOption),
  target: Union(Literal("WEIGHT_BASED"), Literal("FLAT")),
});

export type SetDoseOptions = Static<typeof SetDoseOptions>;

export const AddCitation = Record({
  type: Literal("ADD_CITATION"),
  citation: Citation,
  location: CitationsLocation,
});
export type AddCitation = Static<typeof AddCitation>;

export const PredicatedAction: Runtype<PredicatedAction> = Lazy(() =>
  Record({
    type: Literal("PREDICATE"),
    action: GuidanceAction,
    criteria: Unknown,
  }),
);

export type PredicatedAction = {
  type: "PREDICATE";
  action: GuidanceAction;
  criteria: any;
};

export const GuidanceAction = Union(
  AddCitation,
  PredicatedAction,
  SetDefaultDose,
  SetDoseOptions,
  SetMaxDose,
  ShowBanner,
  ShowAlert,
);
export type GuidanceAction = Static<typeof GuidanceAction>;

export const Guidance = Record({
  executionId: String,
  resultId: String,
  ruleId: String,
  actions: Array(GuidanceAction),
  details: Dictionary(String, String),
});

export type Guidance = Static<typeof Guidance>;
