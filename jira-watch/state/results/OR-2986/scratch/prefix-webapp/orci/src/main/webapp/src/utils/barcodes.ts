import { trim } from "lodash";

export function parseBarcode(barcode: string): string {
  let value = barcode.replace(/^PO/gi, "");
  value = trim(value, "\\");

  if (value === "00188751") {
    // random barcode for Scopolamine should be converted to a real NDC
    value = "1001955302";
  }
  return value;
}
