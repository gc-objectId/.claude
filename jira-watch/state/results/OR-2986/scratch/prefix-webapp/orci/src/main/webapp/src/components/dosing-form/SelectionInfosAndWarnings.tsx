import React from "react";
import { DosingFormBanner } from "./DosingFormBanner";

import { BannerDefinition } from "../../types/BannerDefinition";

export type SelectionInfosAndWarningsProps = {
  warnings: BannerDefinition[];
  infos: BannerDefinition[];
};

export function SelectionInfosAndWarnings({
  warnings,
  infos,
}: SelectionInfosAndWarningsProps) {
  return (
    <>
      {[...warnings, ...infos].map((banner) => {
        return (
          banner.body && (
            <DosingFormBanner
              key={banner.type + "-" + banner.ruleId}
              citations={banner.citations}
              type={banner.type}
              content={banner.body}
              ruleId={banner.ruleId}
              evaluationResultId={banner.evaluationResultId}
            />
          )
        );
      })}
    </>
  );
}
