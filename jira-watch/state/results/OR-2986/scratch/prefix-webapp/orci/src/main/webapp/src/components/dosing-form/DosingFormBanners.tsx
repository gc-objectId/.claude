import { MedicationRoute } from "../../types/MedicationRoute";
import { SelectionInfosAndWarnings } from "./SelectionInfosAndWarnings";

import { BannerDefinition } from "../../types/BannerDefinition";

export type DosingFormBannersProps = {
  warnings: BannerDefinition[];
  infos: BannerDefinition[];
};

export function DosingFormBanners({ warnings, infos }: DosingFormBannersProps) {
  return (
    <div style={{ width: "fit-content" }}>
      <SelectionInfosAndWarnings infos={infos} warnings={warnings} />
    </div>
  );
}
