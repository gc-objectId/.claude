import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import "./DevModeBanner.scss";

const DISMISSED_KEY = "devModeBanner.dismissed";
const HEIGHT_PROPERTY = "--dev-mode-banner-height";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    return;
  }
}

function usePublishedHeight(): (element: HTMLElement | null) => void {
  const [element, setElement] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!element) return;
    const rootStyle = document.documentElement.style;
    const observer = new ResizeObserver(([entry]) => {
      rootStyle.setProperty(
        HEIGHT_PROPERTY,
        `${entry.borderBoxSize[0].blockSize}px`,
      );
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      rootStyle.removeProperty(HEIGHT_PROPERTY);
    };
  }, [element]);
  return setElement;
}

export function DevModeBanner() {
  const [dismissed, setDismissed] = useState(readDismissed);
  const [show, setShow] = useState(false);
  const bannerRef = usePublishedHeight();

  const initialize = useCallback(async () => {
    try {
      const response = await axios.get(
        `/api/is-prod?host=${encodeURI(location.host)}`,
      );
      setShow(!response.data);
    } catch {
      setShow(false);
    }
  }, []);
  useEffect(() => {
    initialize();
  }, []);

  if (!show || dismissed) {
    return null;
  }
  return (
    <button
      ref={bannerRef}
      type="button"
      className="dev-mode-banner"
      onClick={() => {
        writeDismissed();
        setDismissed(true);
      }}
    >
      Development environment
      <span className="dev-mode-banner__hint">click to dismiss</span>
    </button>
  );
}
