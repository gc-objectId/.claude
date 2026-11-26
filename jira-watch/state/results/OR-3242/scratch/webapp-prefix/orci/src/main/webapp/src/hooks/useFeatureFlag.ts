import { Array, Literal, Static, String, Union } from "runtypes";
import { useMemo } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { isLoggedIn } from "../types/User";
import { useAppQueryParams } from "./hooks";
import { isLoaded, Loadable, loading } from "../types/Loadable";

export const FeatureKeyEnum = {
  RECENTLY_ADMINISTERED_MEDS: "RECENTLY_ADMINISTERED_MEDS",
  HELP_TOOLTIP_HOMESCREEN: "HELP_TOOLTIP_HOMESCREEN",
  DOSING_TIME_PRESETS: "DOSING_TIME_PRESETS",
  MEDICATION_FAVORITES: "MEDICATION_FAVORITES",
  MEDICATION_MACROS: "MEDICATION_MACROS",
} as const;

export const FeatureKey = Union(
  Literal(FeatureKeyEnum.RECENTLY_ADMINISTERED_MEDS),
  Literal(FeatureKeyEnum.HELP_TOOLTIP_HOMESCREEN),
  Literal(FeatureKeyEnum.DOSING_TIME_PRESETS),
  Literal(FeatureKeyEnum.MEDICATION_FAVORITES),
  Literal(FeatureKeyEnum.MEDICATION_MACROS),
);

export type FeatureKey = Static<typeof FeatureKey>;

export function useFeatureFlag(featureKey: FeatureKey): boolean {
  const flags = useFeatureFlags();
  return useMemo(
    () => (isLoaded(flags) ? flags.includes(featureKey) : false),
    [featureKey, flags],
  );
}

export function useFeatureFlags(): Loadable<FeatureKey[]> {
  const auth = useAuth();
  const { tenantId } = useAppQueryParams();
  const result = useQuery({
    queryKey: [
      "feature-flags",
      isLoggedIn(auth.user) ? auth.user.username : "",
    ],
    queryFn: async () => {
      const featureFlagResponse = await axios.get("/api/feature-flags", {
        headers: {
          "X-Tenant-Id": tenantId,
        },
      });
      // Validate rather than cast: useFeatureFlag asks `flags.includes(key)`, and on a
      // non-array body that degrades to substring matching, so an unchecked response can
      // answer "enabled" for a flag that is off.
      const result = Array(String).validate(featureFlagResponse.data);
      if (!result.success) {
        console.error("unexpected feature flag response shape", result.message);
        return [];
      }
      // A FeatureId is any string: rule flags are built as `RULE:{ruleId}` and the rest
      // are admin-created rows, so the response carries ids this app has no key for.
      // Drop those per element, or one unknown id disables every flag the app does know.
      return result.value.filter(FeatureKey.guard);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  if (result.isLoading) {
    return loading();
  }

  if (result.error || !result.data) {
    return [];
  }

  return result.data;
}
