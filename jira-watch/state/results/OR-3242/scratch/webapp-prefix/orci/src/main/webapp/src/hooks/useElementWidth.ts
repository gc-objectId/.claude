import { useCallback, useEffect, useState } from "react";

/**
 * Tracks the border-box inline width of an element via ResizeObserver.
 * Returns a callback ref and the current width in pixels.
 * Pass `enabled = false` to skip observation (width stays 0).
 */
export function useElementWidth(
  enabled: boolean = true,
): [ref: (el: HTMLElement | null) => void, width: number] {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const ref = useCallback((node: HTMLElement | null) => setEl(node), []);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!enabled || !el) return;
    setWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, el]);

  return [ref, width];
}
