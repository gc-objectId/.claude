import { EvaluationResult } from "../../types/EvaluationResult";
import alertNotification from "../../audio/alert-notification.mp3";
import { isAlert, isWarning } from "../predicates";
import { SelectedMedication } from "../../types/SelectedMedication";
import { captureMessage } from "@sentry/react";

import { logger } from "../logger";
export async function playAlertAudio(
  results: EvaluationResult[],
  medication: SelectedMedication,
  beepOnAlert: boolean,
) {
  let hasAlert = results?.some(isAlert);

  const noBeepWarningRuleIds = [
    "w-last-local-anesthetic-max-dose",
    "w-weight-type-adjustment",
  ];
  let hasWarning = results?.some(
    (it) =>
      isWarning(it) &&
      !noBeepWarningRuleIds.includes(it.ruleId) &&
      it.prompt.prompty,
  );

  if ((beepOnAlert && hasAlert) || (!hasAlert && hasWarning)) {
    await playBeep();
  }
  const url = getMedicationAudioUrl(medication.medicationIdentifier);
  const blob = await getAudioBlob(url);
  if (blob === undefined) return;
  await playAudioAndWaitForCompletion(blob);
}

const audioCache: Record<string, Blob> = {};

export async function preloadCommonMedicationAudioAnnouncements() {
  const commonMedIds = [
    getMedicationAudioUrl("m-lidocaine"),
    getMedicationAudioUrl("m-fentanyl"),
    getMedicationAudioUrl("m-propofol"),
    getMedicationAudioUrl("m-rocuronium"),
    getMedicationAudioUrl("m-succinylcholine"),
    getMedicationAudioUrl("m-ketorolac"),
    getMedicationAudioUrl("m-ondansetron-iv"),
    getMedicationAudioUrl("m-ondansetron-oral"),
    getMedicationAudioUrl("m-scopolamine"),
    getMedicationAudioUrl("m-midazolam"),
    alertNotification as string,
  ];
  return Promise.all(commonMedIds.map(loadAndCacheAudio));
}

async function loadAndCacheAudio(url: string): Promise<Blob | undefined> {
  logger.debug("loading and caching audio file:", url);
  const result = await fetch(url);
  logger.debug(url, "result", result);
  if (
    result.headers.get("content-type") === "text/html" ||
    result.status === 404
  ) {
    captureMessage("Missing audio file: ", { tags: { url } });
    return undefined;
  }
  const blob = await result.blob();
  audioCache[url] = blob;
  return blob;
}

const AUDIO_RELEASE = import.meta.env.VITE_GIT_SHA || "dev";

function getMedicationAudioUrl(medId: string) {
  return "../audio/medications/" + medId + ".mp3?v=" + AUDIO_RELEASE;
}

async function getAudioBlob(url: string): Promise<Blob | undefined> {
  return audioCache[url] || loadAndCacheAudio(url);
}

export async function playBeep() {
  const blob = await getAudioBlob(alertNotification);
  if (blob === undefined) return;
  return playAudioAndWaitForCompletion(blob);
}

async function playAudioAndWaitForCompletion(audioSrc: Blob): Promise<void> {
  try {
    const audioUrl = URL.createObjectURL(audioSrc);
    let audio = new Audio(audioUrl);
    audio.load();
    await audio.play();
    return new Promise((resolve) => {
      audio.addEventListener("ended", function () {
        resolve();
      });
    });
  } catch (e) {
    // playing audio can fail if the browser blocks it
    // e.g. if it requires a user interaction before allowing audio
    // or else if the audio file was missing/invalid
    return Promise.resolve();
  }
}
