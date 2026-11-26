import { Literal, Static, Union } from "runtypes";

export const ObservationTypeEnum = {
  BIRTH_HEIGHT: "BIRTH_HEIGHT",
  BIRTH_WEIGHT: "BIRTH_WEIGHT",
  BLOOD_TRANSFUSION: "BLOOD_TRANSFUSION",
  EBL: "EBL",
  BODY_HEIGHT: "BODY_HEIGHT",
  BODY_WEIGHT: "BODY_WEIGHT",
  CREATININE: "CREATININE",
  EGFR: "EGFR",
  GESTATIONAL_AGE_BIRTH: "GESTATIONAL_AGE_BIRTH",
  GLUCOSE: "GLUCOSE",
  HEART_RATE: "HEART_RATE",
  O2_SATURATION: "O2_SATURATION",
  POTASSIUM: "POTASSIUM",
  PREGNANCY_STATUS: "PREGNANCY_STATUS",
  PTT: "PTT",
  PT_INR: "PT_INR",
  QTC_INTERVAL: "QTC_INTERVAL",
  TOF: "TOF",
  TOF_RATIO: "TOF_RATIO",
  MRSA_INFECTION: "MRSA_INFECTION",
};

export const ObservationTypeOptions = Object.values(ObservationTypeEnum);

export const ObservationType = Union(
  Literal(ObservationTypeEnum.BIRTH_HEIGHT),
  Literal(ObservationTypeEnum.BIRTH_WEIGHT),
  Literal(ObservationTypeEnum.BLOOD_TRANSFUSION),
  Literal(ObservationTypeEnum.EBL),
  Literal(ObservationTypeEnum.BODY_HEIGHT),
  Literal(ObservationTypeEnum.BODY_WEIGHT),
  Literal(ObservationTypeEnum.CREATININE),
  Literal(ObservationTypeEnum.EGFR),
  Literal(ObservationTypeEnum.GESTATIONAL_AGE_BIRTH),
  Literal(ObservationTypeEnum.GLUCOSE),
  Literal(ObservationTypeEnum.HEART_RATE),
  Literal(ObservationTypeEnum.O2_SATURATION),
  Literal(ObservationTypeEnum.POTASSIUM),
  Literal(ObservationTypeEnum.PREGNANCY_STATUS),
  Literal(ObservationTypeEnum.PTT),
  Literal(ObservationTypeEnum.PT_INR),
  Literal(ObservationTypeEnum.QTC_INTERVAL),
  Literal(ObservationTypeEnum.TOF),
  Literal(ObservationTypeEnum.TOF_RATIO),
  Literal(ObservationTypeEnum.MRSA_INFECTION),
);

export type ObservationType = Static<typeof ObservationType>;
