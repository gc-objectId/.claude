import { TabData } from "../types/TabData";
import { TabID } from "../types/identifiers";
import { TabType } from "../types/TabType";
import { AlertDefinition } from "../types/AlertDefinition";
import { useCallback, useMemo, useReducer } from "react";
import { assertUnreachable } from "../utils/asserts";
import { DateTime, Duration } from "luxon";

import { logger } from "../utils/logger";
export const TabNames = {
  HOME_TAB: "HOME_TAB" as TabID,
  APP_LAUNCH_RULE_TAB: "APP_LAUNCH_RULE_TAB" as TabID,
  VITAL_SIGNS_OPT_IN_TAB: "VITAL_SIGNS_OPT_IN_TAB" as TabID,
  RESTORE_MEDS_FROM_CURRENT_USER_TAB:
    "RESTORE_MEDS_FROM_CURRENT_USER_TAB" as TabID,
  RESTORE_MEDS_FROM_OTHER_USERS_TAB:
    "RESTORE_MEDS_FROM_OTHER_USERS_TAB" as TabID,
};

type TabState = {
  tabs: TabData[];
  selectedTabName: TabID | undefined;
};

type TabStateMsg =
  | { type: "addTab"; tabData: TabData; select: boolean }
  | { type: "removeTab"; tabName: TabID }
  | { type: "addGuidance"; tabName: TabID; guidance: AlertDefinition }
  | { type: "markStale"; tabName: TabID }
  | { type: "selectTab"; tabName: TabID; onlyIfCurrentlySelected?: TabID }
  | { type: "setCanCloseTab"; tabName: TabID; canClose: boolean }
  | {
      type: "updateTab";
      tabName: TabID;
      tabData: TabData;
      select?: boolean;
      selectIfCurrentlySelected?: boolean;
    }
  | { type: "patchTab"; tabName: TabID; patch: Partial<TabData> };

export function createHomeTab(): TabData {
  return {
    name: TabNames.HOME_TAB,
    type: TabType.MEDICATION_SELECTION_FORM,
    title: "+",
    created: DateTime.now(),
  };
}

export function createRestoreMedsFromCurrentUserTab(): TabData {
  return {
    name: TabNames.RESTORE_MEDS_FROM_CURRENT_USER_TAB,
    type: TabType.RESTORE_MEDS_FROM_CURRENT_USER,
    title: "Restore Meds",
    created: DateTime.now(),
  };
}

export function createRestoreMedsFromOtherUsersTab(): TabData {
  return {
    name: TabNames.RESTORE_MEDS_FROM_OTHER_USERS_TAB,
    type: TabType.RESTORE_MEDS_FROM_OTHER_USERS,
    title: "Restore Meds",
    created: DateTime.now(),
  };
}

function initializeTabState(): TabState {
  const home = createHomeTab();
  return {
    tabs: [home],
    selectedTabName: home.name,
  };
}

function tabReducer(state: TabState, msg: TabStateMsg): TabState {
  const type = msg.type;
  switch (type) {
    case "markStale":
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.name === msg.tabName ? { ...tab, isStale: true } : tab,
        ),
      };
    case "addTab":
      return {
        ...state,
        tabs: [...state.tabs, msg.tabData],
        selectedTabName: msg.select ? msg.tabData.name : state.selectedTabName,
      };
    case "removeTab":
      return {
        ...state,
        tabs: state.tabs.filter((tab) => tab.name !== msg.tabName),
        selectedTabName:
          msg.tabName === state.selectedTabName
            ? undefined
            : state.selectedTabName,
      };
    case "addGuidance":
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.name === msg.tabName
            ? {
                ...tab,
                guidance:
                  tab.guidance === undefined
                    ? [msg.guidance]
                    : [...tab.guidance, msg.guidance],
              }
            : tab,
        ),
      };
    case "selectTab":
      if (
        msg.onlyIfCurrentlySelected !== undefined &&
        state.selectedTabName !== msg.onlyIfCurrentlySelected
      ) {
        return state;
      }
      if (!state.tabs.some((it) => it.name === msg.tabName)) {
        logger.warn(
          `ignoring request to set tab to ${msg.tabName} since that ID isn't present in the tabs list`,
        );
        return state;
      }
      return {
        ...state,
        selectedTabName: msg.tabName,
      };
    case "updateTab": {
      logger.debug("Update tab message: ", msg);
      const tabExisted = state.tabs.some((tab) => tab.name === msg.tabName);
      const wasSelected = state.selectedTabName === msg.tabName;
      const updatedTabs = state.tabs.map((tab) =>
        tab.name === msg.tabName ? msg.tabData : tab,
      );
      const shouldSelect =
        tabExisted &&
        (msg.select || (msg.selectIfCurrentlySelected && wasSelected));
      return {
        ...state,
        tabs: updatedTabs,
        selectedTabName: shouldSelect
          ? msg.tabData.name
          : state.selectedTabName,
      };
    }
    case "patchTab":
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.name === msg.tabName ? { ...tab, ...msg.patch } : tab,
        ),
      };
    case "setCanCloseTab":
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.name === msg.tabName ? { ...tab, canClose: msg.canClose } : tab,
        ),
      };
    default:
      assertUnreachable(type);
  }
}

export type GuidanceTabsHook = {
  getTabs(): Readonly<TabState["tabs"]>;
  addTab(
    data: TabData,
    options: { select?: boolean; staleDuration?: Duration },
  ): void;
  hasOpenTabs(): boolean;
  removeTab(tabName: TabID): void;
  getSelectedTab(): TabData | undefined;
  tabExists(tabName: TabID): boolean;
  tabWithTypeExists(type: TabType, date: Date): boolean;
  tabWithTitleExists(title: string): boolean;
  getTab(tabName: TabID): TabData | undefined;
  selectTab(
    tabName: TabID,
    options?: { onlyIfCurrentlySelected?: TabID },
  ): void;
  findStale(): TabData[];
  markTabAsStale(tabName: TabID): void;
  updateTab(
    tabName: TabID,
    data: TabData,
    options?: {
      staleDuration?: Duration;
      select?: boolean;
      selectIfCurrentlySelected?: boolean;
    },
  ): void;
  patchTab(tabName: TabID, patch: Partial<TabData>): void;
  getRecentTab(tabPrefix: string, createTime: DateTime): TabData | undefined;
  setCanCloseTab(tabName: TabID, canClose: boolean): void;
  clearStaleTimer(tabName: TabID): void;
};

export function createTab(
  name: string,
  tabData: Omit<TabData, "name">,
): TabData {
  return {
    name: name as TabID,
    ...tabData,
  };
}

export function useGuidanceTabs(): GuidanceTabsHook {
  const [tabState, updateTabState] = useReducer(
    tabReducer,
    null as any,
    initializeTabState,
  );

  const getTabs = useCallback(() => {
    return tabState.tabs;
  }, [tabState.tabs]);

  const getTab = useCallback(
    (tabName: TabID) => {
      return tabState.tabs.find((it) => it.name === tabName);
    },
    [tabState.tabs],
  );

  const tabExists = useCallback(
    (tabName: string) => {
      return tabState.tabs.some((it) => it.name === tabName);
    },
    [tabState.tabs],
  );

  const markTabAsStale = useCallback((tabName: TabID) => {
    logger.debug("marking tab as stale:", tabName);
    updateTabState({ type: "markStale", tabName });
  }, []);

  const addTab = useCallback(
    (
      tabData: TabData,
      {
        select = false,
        staleDuration,
      }: { select?: boolean; staleDuration?: Duration },
    ) => {
      if (tabExists(tabData.name)) {
        logger.debug("Tab already exists", tabData.name);
        return;
      }
      logger.debug("Create tab", tabData.name);
      if (staleDuration) {
        tabData.staleTimer = setTimeout(
          () => markTabAsStale(tabData.name),
          staleDuration.as("milliseconds"),
        );
      }
      updateTabState({ type: "addTab", tabData: tabData, select });
    },
    [markTabAsStale, tabExists],
  );

  const hasOpenTabs = useCallback(() => {
    return getTabs().length > 1;
  }, [getTabs]);

  // Existence is validated inside the reducer against current state, not this
  // closure's tabState snapshot, which can be stale when a tab created earlier
  // in the same async flow is selected after an await.
  const selectTab = useCallback(
    (tabName: TabID, options?: { onlyIfCurrentlySelected?: TabID }) => {
      if (!tabName) return;
      logger.debug("select tab", tabName);
      updateTabState({
        type: "selectTab",
        tabName,
        onlyIfCurrentlySelected: options?.onlyIfCurrentlySelected,
      });
    },
    [],
  );

  const tabWithTypeExists = useCallback(
    (type: TabType, date: Date) => {
      return tabState.tabs.some(
        (tab: TabData) =>
          tab.type === type && !tab.pending && tab.created.toJSDate() < date,
      );
    },
    [tabState.tabs],
  );

  const tabWithTitleExists = useCallback(
    (title: string) => {
      return tabState.tabs.some((tab: TabData) => tab.title === title);
    },
    [tabState.tabs],
  );

  const findStale = useCallback(() => {
    return tabState.tabs.filter((tab) => tab.isStale);
  }, [tabState.tabs]);

  const getSelectedTab = useCallback(() => {
    return tabState.selectedTabName === undefined
      ? undefined
      : tabState.tabs.find((it) => it.name === tabState.selectedTabName);
  }, [tabState.selectedTabName, tabState.tabs]);

  const updateTab = useCallback(
    (
      tabName: TabID,
      tabData: TabData,
      options?: {
        staleDuration?: Duration;
        select?: boolean;
        selectIfCurrentlySelected?: boolean;
      },
    ) => {
      if (options?.staleDuration) {
        tabData.staleTimer = setTimeout(
          () => markTabAsStale(tabData.name),
          options.staleDuration.as("milliseconds"),
        );
      }
      updateTabState({
        type: "updateTab",
        tabName,
        tabData,
        select: options?.select,
        selectIfCurrentlySelected: options?.selectIfCurrentlySelected,
      });
    },
    [markTabAsStale],
  );

  const patchTab = useCallback((tabName: TabID, patch: Partial<TabData>) => {
    updateTabState({ type: "patchTab", tabName, patch });
  }, []);

  const getRecentTab = useCallback(
    (tabPrefix: string, createTime: DateTime) => {
      if (!createTime) return undefined;
      return tabState.tabs.find((tab) => {
        const nameStartsWithPrefix = tab.name.startsWith(tabPrefix);
        const hasCreateTime = !!tab.created;
        const secondsSinceLastCreation = hasCreateTime
          ? createTime.diff(tab.created!).as("seconds")
          : Number.MAX_VALUE;
        return (
          nameStartsWithPrefix && hasCreateTime && secondsSinceLastCreation <= 3
        );
      });
    },
    [tabState.tabs],
  );

  const setCanCloseTab = useCallback((tabName: TabID, canClose: boolean) => {
    updateTabState({ type: "setCanCloseTab", tabName, canClose });
  }, []);

  const clearStaleTimer = useCallback(
    (tabName: TabID) => {
      const tab = getTab(tabName);
      if (tab?.staleTimer) {
        clearTimeout(tab.staleTimer);
      }
    },
    [getTab],
  );

  const removeTab = useCallback(
    (tabName: TabID) => {
      clearStaleTimer(tabName);
      updateTabState({ type: "removeTab", tabName });
    },
    [clearStaleTimer],
  );

  return {
    addTab,
    removeTab,
    hasOpenTabs,
    getTabs,
    selectTab,
    markTabAsStale,
    tabExists,
    tabWithTypeExists,
    tabWithTitleExists,
    findStale,
    getSelectedTab,
    getTab,
    updateTab,
    patchTab,
    getRecentTab,
    setCanCloseTab,
    clearStaleTimer,
  };
}
