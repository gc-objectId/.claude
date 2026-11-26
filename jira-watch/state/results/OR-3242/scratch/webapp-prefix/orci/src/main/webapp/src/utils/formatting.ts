import { Gender } from "../types/Gender";

export function formatGender(gender: Gender): string {
  switch (gender) {
    case "MALE":
      return "Male";
    case "FEMALE":
      return "Female";
    case "NON_BINARY":
      return "Nonbinary";
    case "NON_DISCLOSE":
      return "Non-disclose";
    case "TRANSGENDER_MALE":
      return "Transgender Male";
    case "UNKNOWN":
      return "Unknown";
    case "OTHER":
      return "Other";
    case "TRANSGENDER_FEMALE":
      return "Transgender Female";
  }
}

export function getNumberWithOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
