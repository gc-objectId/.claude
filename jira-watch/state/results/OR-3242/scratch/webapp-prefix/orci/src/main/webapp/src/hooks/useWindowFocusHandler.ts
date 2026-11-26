import { useEffect } from "react";
import { disableCloseDialog, enableCloseDialog } from "../utils/windowControl";
import { playBeep } from "../utils/dosingForm/playAlertAudio";

export function useWindowFocusHandler() {
  useEffect(() => {
    const onFocus = (ev: FocusEvent) => {
      enableCloseDialog();
    };
    const onBlur = (ev: FocusEvent) => {
      disableCloseDialog();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
}
