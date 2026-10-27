import { forwardRef } from "react";
import Select, {
  createFilter,
  CSSObjectWithLabel,
  SelectInstance,
  StylesConfig,
} from "react-select";

export type MedOption = { value: string; label: string };

const FILTER_CONFIG = {
  ignoreCase: true,
  ignoreAccents: true,
  trim: true,
  matchFrom: "start" as const,
};

const STYLES: StylesConfig<MedOption> = {
  menu: (base) => ({ ...base, zIndex: 9999 } as CSSObjectWithLabel),
  option: (base, { isSelected }) =>
    ({
      ...base,
      background: isSelected ? "#DEEBFF" : base.background,
      color: "black",
      fontWeight: isSelected ? "bold" : base.fontWeight,
    } as CSSObjectWithLabel),
  noOptionsMessage: (base) =>
    ({ ...base, textAlign: "left" } as CSSObjectWithLabel),
};

interface MedicationSelectProps {
  options: MedOption[];
  onChange: (option: MedOption | null) => void;
  inputId?: string;
  autoFocus?: boolean;
}

export const MedicationSelect = forwardRef<
  SelectInstance<MedOption>,
  MedicationSelectProps
>(function MedicationSelect({ options, onChange, inputId, autoFocus }, ref) {
  return (
    <Select<MedOption>
      inputId={inputId}
      ref={ref}
      autoFocus={autoFocus}
      options={options}
      placeholder="Search medications..."
      filterOption={createFilter(FILTER_CONFIG)}
      onChange={onChange}
      value={null}
      isClearable
      styles={STYLES}
      noOptionsMessage={() => "No matching medications"}
    />
  );
});
