import React, { useCallback, useEffect, useMemo, useState } from "react";
import { clamp } from "lodash";

export type ResizableParams = {
  defaultSize: number;
  minSize: number;
  maxSize: number;
  storageKey: string;
  direction: "horizontal" | "vertical";
};

export function useResizable({
  defaultSize,
  minSize,
  maxSize,
  storageKey,
  direction,
}: ResizableParams) {
  const [isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : defaultSize;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(size));
  }, [size, storageKey]);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startPos = direction === "horizontal" ? e.clientX : e.clientY;
      const startSize = size;
      setIsResizing(true);

      const handleMouseMove = (e: MouseEvent) => {
        const newMousePos = direction === "horizontal" ? e.clientX : e.clientY;
        const newSize = clamp(
          startSize + (startPos - newMousePos),
          minSize,
          maxSize,
        );
        setSize(newSize);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };

      document.body.style.userSelect = "none";
      document.body.style.cursor =
        direction === "horizontal" ? "ew-resize" : "ns-resize";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [direction, maxSize, minSize, size],
  );

  return useMemo(
    () => ({
      handleResizeMouseDown,
      size,
      isResizing,
    }),
    [handleResizeMouseDown, size, isResizing],
  );
}
