import { useCallback, useRef } from "react";

export function useCooldown<T extends (...args: any[]) => any>(
  fn: T,
  cooldownMs: number,
): T {
  const cooldownRef = useRef(false);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      setTimeout(() => {
        cooldownRef.current = false;
      }, cooldownMs);
      return fn(...args);
    }) as T,
    [fn, cooldownMs],
  );
}
