import { KeyboardEvent } from "react";

const NON_TEXT_INPUT_TYPES = new Set([
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "range",
  "color",
  "file",
  "image",
]);

export function cancelOnEscape(cancel: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };
}

export function isFormField(target: EventTarget | null) {
  if (target instanceof HTMLInputElement)
    return !NON_TEXT_INPUT_TYPES.has(target.type);
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches("textarea, select"))
  );
}
