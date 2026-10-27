import {
  RefObject,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  RuleSettingsContext,
  RuleSettingsContext_,
} from "../context/RuleSettingsContext";
import {
  AlertResultID,
  CaseID,
  EncounterID,
  PatientID,
  TenantID,
  UserID,
} from "../types/identifiers";
import { deriveTenantId } from "../utils/tenant";

export function useNow(updateIntervalMs = 1000) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const updateNowInterval = setInterval(() => {
      setNow(new Date());
    }, updateIntervalMs);
    return () => {
      clearInterval(updateNowInterval);
    };
  }, [updateIntervalMs]);
  return now;
}

export function useRuleSettings(): RuleSettingsContext_ {
  return useContext(RuleSettingsContext);
}

export type AppQueryParams = {
  patientId: PatientID;
  caseId: CaseID;
  tenantId: TenantID;
  userId: UserID;
  encounterId: EncounterID;
  epicSourceAuth: string;
  epicSourceClient: string;
  epicSourceSeq: string;
  alertId: AlertResultID;
  forceLaunch: boolean;
};

export function getAppQueryParams(search: URLSearchParams): AppQueryParams {
  return {
    patientId: search.get("patient_id") as PatientID,
    caseId: search.get("case_id") as CaseID,
    tenantId: deriveTenantId() as TenantID,
    userId: search.get("user_id") as UserID,
    encounterId: search.get("encounter_id") as EncounterID,
    epicSourceAuth: search.get("EpicSourceAuth") as string,
    epicSourceClient: search.get("EpicSourceClient") as string,
    epicSourceSeq: search.get("EpicSourceSeq") as string,
    alertId: search.get("alert_id") as AlertResultID,
    forceLaunch: search.get("forceLaunch") === "true",
  };
}

export function useAppQueryParams(): AppQueryParams {
  return useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    return getAppQueryParams(search);
  }, []);
}

export function useHasClickedOutside(ref: RefObject<HTMLElement | undefined>): {
  hasClickedOutside: boolean;
  reset(): void;
} {
  const [hasClickedOutside, setHasClickedOutside] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!ref?.current) {
        return;
      }
      if (!ref.current.contains(event.target as Node)) {
        setHasClickedOutside(true);
      } else {
        setHasClickedOutside(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref]);

  return {
    hasClickedOutside,
    reset() {
      setHasClickedOutside(false);
    },
  };
}

export function useKeyPressed(key: string): boolean {
  const [pressed, setPressed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === key) {
        // Clear any existing timeout
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
        }

        setPressed(true);
        timeoutRef.current = setTimeout(() => {
          setPressed(false);
          timeoutRef.current = null;
        });
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [key]);
  return pressed;
}
