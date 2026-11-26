import { PromptTypeEnum } from "../types/PromptType";
import { EvaluationResult } from "../types/EvaluationResult";

export const isObject = (obj: unknown): obj is Object => obj === Object(obj);

export const isFormData = (thing: any): thing is FormData => {
  const pattern = "[object FormData]";
  return (
    thing &&
    ((typeof FormData === "function" && thing instanceof FormData) ||
      toString.call(thing) === pattern ||
      (isFunction(thing.toString) && thing.toString() === pattern))
  );
};

export const typeOfTest = (type: any) => (thing: any) => typeof thing === type;

export const isFunction = typeOfTest("function");

export function isDefined<T>(it: T | null | undefined): it is T {
  return it !== null && it !== undefined;
}

export function guidanceIs(t: PromptTypeEnum) {
  return (guidance: EvaluationResult) => guidance?.prompt?.type === t;
}

export function guidanceIsNot(t: PromptTypeEnum) {
  return (guidance: EvaluationResult) => guidance?.prompt?.type !== t;
}

export const isAlert = guidanceIs(PromptTypeEnum.ALERT);
export const isWarning = guidanceIs(PromptTypeEnum.WARNING);
export const isNotAlert = guidanceIsNot(PromptTypeEnum.ALERT);
