import { createContext, PropsWithChildren, useContext } from "react";
import { SelectedMedication } from "../types/SelectedMedication";

export type MedicationSelectionContext_ = {
  medication: SelectedMedication;
};

const MedicationSelectionContext =
  createContext<MedicationSelectionContext_ | null>(null);

export function MedicationSelectionContextProvider({
  children,
  medication,
}: PropsWithChildren<MedicationSelectionContext_>) {
  return (
    <MedicationSelectionContext.Provider
      value={{
        medication,
      }}
    >
      {children}
    </MedicationSelectionContext.Provider>
  );
}

export function useMedicationSelectionContext() {
  return useContext(MedicationSelectionContext);
}
