import type { ThemeConfig } from "react-select";

export const guidedSelectTheme: ThemeConfig = (theme) => ({
  ...theme,
  borderRadius: 6,
  colors: {
    ...theme.colors,
    primary: "var(--guided-color-heading)",
    primary75: "var(--guided-color-surface-hover)",
    primary50: "var(--guided-color-surface-hover)",
    primary25: "var(--guided-color-surface-hover)",
    danger: "var(--guided-color-danger)",
    neutral0: "var(--guided-color-surface)",
    neutral20: "var(--guided-color-border-muted)",
    neutral30: "var(--guided-color-heading)",
    neutral80: "var(--guided-color-text)",
  },
});
