import {
  EventType,
  TrackingEventService,
} from "../services/TrackingEventService";

import { logger } from "./logger";
const DEFAULT_TITLE = "Guided Clinical Solutions";
const MINIMIZE_TITLE = `${DEFAULT_TITLE} - .`;
const FOCUS_TITLE = `${DEFAULT_TITLE} - *`;
const CLOSE_TITLE = `${DEFAULT_TITLE} - X`;

const track = (
  type: string,
  windowHasFocus: boolean,
  trackingEventService?: TrackingEventService,
) => {
  if (trackingEventService) {
    trackingEventService.recordEvent(EventType.WINDOW_NOTIFY, {
      notificationType: type,
      title: window.document.title,
      windowHasFocus: windowHasFocus,
    });
  }
};
// updates the window to indicate focus and then reverts
export const focusWindow = (trackingService?: TrackingEventService) => {
  logger.debug("Focusing the window");
  const windowHasFocus = document.hasFocus();
  window.document.title = FOCUS_TITLE;
  track("focus", windowHasFocus, trackingService);

  setTimeout(() => {
    resetWindowTitle();
  }, 1000);
};

// updates the window to indicate close
export const closeWindow = (trackingService?: TrackingEventService) => {
  const windowHasFocus = document.hasFocus();
  window.document.title = CLOSE_TITLE;
  track("close", windowHasFocus, trackingService);
};

// updates the window to indicate minimize and then reverts
export const minimizeWindow = (trackingService?: TrackingEventService) => {
  const windowHasFocus = document.hasFocus();
  window.document.title = MINIMIZE_TITLE;
  track("minimize", windowHasFocus, trackingService);

  setTimeout(() => {
    resetWindowTitle();
  }, 1000);
};

// updates the window title to the default value
export const resetWindowTitle = () => {
  window.document.title = DEFAULT_TITLE;
};

export var DISABLE_CLOSE_DIALOG = false;

export function disableCloseDialog() {
  DISABLE_CLOSE_DIALOG = true;
}

export function enableCloseDialog() {
  DISABLE_CLOSE_DIALOG = false;
}
