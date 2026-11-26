import React from "react";
import { LaunchBlockedDTO } from "../types/ApplicationLaunchContext";
import { Interstitial } from "./Interstitial";

export function LaunchBlockedDisplay(props: { reason: LaunchBlockedDTO }) {
  return (
    <Interstitial title={props.reason.title} tone="muted" role="alert">
      <p>{props.reason.explanation}</p>
    </Interstitial>
  );
}
