// formats value to 2 digits, if value is >= max, use max - 1
export const formatTime = (
  value: string | number,
  num_digits?: number,
  max?: number,
): string => {
  let val = String(value).replace(/[a-z]/gi, "");
  if (num_digits) {
    val = val.substring(val.length - num_digits);
  }
  let n = parseInt(val);
  // if max is provided
  if (max && n >= max) {
    n = max - 1;
  }
  if (isNaN(n)) {
    return "";
  }
  if (n >= 0 && n < 10) {
    return "0" + String(n);
  }
  return String(n);
};
