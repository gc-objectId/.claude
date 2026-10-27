import React, { useMemo } from "react";
import {
  ExclamationTriangleFill,
  IconProps,
  InfoCircleFill,
} from "react-bootstrap-icons";
import { PromptType, PromptTypeEnum } from "../../types/PromptType";
import { Citation } from "../../types/Citation";
import { Alert, OverlayTrigger, Tooltip } from "react-bootstrap";
import { templateHTML } from "../../utils/markup";
import { RuleCitationContainer } from "../Alert/RuleCitationContainer";
import { RuleID, AlertResultID } from "../../types/identifiers";
import "./DosingFormBanner.scss";

export type SelectionInfoProps = {
  citations: Citation[];
  content: string;
  type: PromptType;
  ruleId: RuleID;
  evaluationResultId: AlertResultID;
};

export function DosingFormBanner({
  citations,
  content,
  type,
  ruleId,
  evaluationResultId,
}: SelectionInfoProps) {
  const containsCitationPlaceholder = content.includes("<Citation></Citation>");
  const parsedContent = useMemo(
    () => templateHTML(content, evaluationResultId, citations),
    [content, citations],
  );
  const hasCitations = citations.length > 0;
  return (
    <Alert
      variant={typeToVariant[type]}
      className="d-flex mt-2 align-items-baseline"
      data-rule-id={ruleId}
      data-rule-type={type}
    >
      <OverlayTrigger
        placement="right"
        delay={800}
        overlay={<Tooltip>{ruleId}</Tooltip>}
      >
        <div className="d-flex justify-content-center align-items-center">
          <BannerIcon type={type} className="me-2" />
        </div>
      </OverlayTrigger>
      <span className={`d-inline ${hasCitations ? "me-2" : ""}`}>
        {parsedContent}
      </span>

      {!containsCitationPlaceholder && hasCitations && (
        <div style={{ width: "8px" }}>
          <div style={{ position: "absolute", top: "8px" }}>
            <RuleCitationContainer
              citations={citations}
              evaluationResultId={evaluationResultId}
            />
          </div>
        </div>
      )}
    </Alert>
  );
}

function BannerIcon({
  type,
  ...props
}: {
  type: PromptTypeEnum;
} & IconProps) {
  switch (type) {
    case PromptTypeEnum.ALERT:
      return (
        // prettier-ignore
        <ExclamationTriangleFill {...props} style={{color: "#f33535", minWidth: "16px", marginBottom: "-4px"}}/>
      );
    case PromptTypeEnum.WARNING:
      return (
        // prettier-ignore
        <ExclamationTriangleFill {...props}
                                         style={{color: "#f3da35", minWidth: "16px", transform: "translateY(1px)"}}/>
      );
    case PromptTypeEnum.INFO:
      return (
        // prettier-ignore
        <InfoCircleFill {...props} size={15}
                                style={{color: "#5880AD", minWidth: "15px", transform: "translateY(2px)"}}/>
      );
  }
}

const typeToVariant: Record<PromptTypeEnum, string> = {
  [PromptTypeEnum.INFO]: "info",
  [PromptTypeEnum.WARNING]: "warning",
  [PromptTypeEnum.ALERT]: "danger",
};
