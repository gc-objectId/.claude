export const SIMULATION_MODES = [
  { key: "single", label: "Single" },
  { key: "batch", label: "Batch" },
  { key: "default-ndcs", label: "Default NDCs" },
  { key: "notification", label: "Notification" },
] as const;

export type SimulationMode = (typeof SIMULATION_MODES)[number]["key"];

export const DEFAULT_SIMULATION_MODE: SimulationMode = "single";

export function toSimulationMode(value: string | null): SimulationMode {
  const match = SIMULATION_MODES.find((mode) => mode.key === value);
  return match ? match.key : DEFAULT_SIMULATION_MODE;
}

export const SIMULATION_PATH = "/admin/simulation";

export function simulationPath(mode: SimulationMode): string {
  return `${SIMULATION_PATH}?mode=${mode}`;
}

export const FORMER_SIMULATION_ROUTES: {
  path: string;
  mode: SimulationMode;
}[] = [
  { path: "simulation/med-admin", mode: "single" },
  { path: "simulation/med-admins", mode: "batch" },
  { path: "simulation/med-admin-default-ndcs", mode: "default-ndcs" },
  { path: "simulation/med-admin-notification", mode: "notification" },
];
