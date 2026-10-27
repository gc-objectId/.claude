import { RuleCitation } from "./RuleCitation";
import { OverlayTrigger, OverlayTriggerProps } from "react-bootstrap";
import { RuleCitationTooltip } from "./RuleCitationTooltip";
import { Citation } from "../../types/Citation";
import { QuestionCircle } from "react-bootstrap-icons";
import React, { useState } from "react";
import { OverlayInjectedProps } from "react-bootstrap/esm/Overlay";
import { useAppQueryParams } from "../../hooks/hooks";
import { EventType } from "../../services/TrackingEventService";
import { AlertResultID } from "../../types/identifiers";
import { useTrackingEvent } from "../../hooks/useTrackingEvent";
import { uniqBy } from "lodash";

export type RuleReferenceContainerProps = {
  citations: Citation[];
  iconSize?: number | string;
  evaluationResultId?: AlertResultID;
};

export interface HoverKeepAliveOverlayTriggerProps
  extends Omit<OverlayTriggerProps, "overlay"> {
  overlay: (
    props: OverlayInjectedProps & { onMouseEnter: any; onMouseLeave: any },
  ) => React.ReactNode;
}

function HoverKeepAliveOverlayTrigger({
  overlay,
  citations,
  evaluationResultId,
  ...props
}: HoverKeepAliveOverlayTriggerProps & {
  citations?: Citation[];
  evaluationResultId?: AlertResultID;
}) {
  const { patientId, caseId } = useAppQueryParams();
  const { recordEvent } = useTrackingEvent(patientId, caseId);
  const [hovering, setHovering] = useState(false);
  const [show, setShow] = useState(false);

  return (
    <OverlayTrigger
      {...props}
      show={props.show || show || hovering}
      onToggle={(t) => {
        if (props.onToggle) props.onToggle(t);
        setShow(t);

        // Track when tooltip is shown
        if (t && citations && citations.length > 0) {
          recordEvent(EventType.CITATION_TOOLTIP_HOVER, {
            evaluationResultId: evaluationResultId,
            citationIds: citations.map((citation) => citation.id),
          });
        }
      }}
      overlay={(overlayProps) => {
        if (typeof overlay === "function") {
          return overlay({
            ...overlayProps,
            onMouseEnter() {
              setHovering(true);
            },
            onMouseLeave() {
              setHovering(false);
            },
          });
        } else {
          throw new Error("Not supported");
        }
      }}
    />
  );
}

export function RuleCitationContainer({
  citations: rawCitations,
  iconSize = 14,
  evaluationResultId,
}: RuleReferenceContainerProps) {
  if (
    rawCitations == null ||
    (Array.isArray(rawCitations) && rawCitations.length === 0)
  ) {
    return <></>;
  }
  // Collect all rule IDs per citation ID before deduplication, since multiple
  // rules can produce the same citation and we want to preserve all associations.
  const ruleIdsByCitationId = new Map<string, string[]>();
  rawCitations.forEach((c) => {
    if (!c.ruleId) return;
    const ids = ruleIdsByCitationId.get(c.id) ?? [];
    if (!ids.includes(c.ruleId)) ids.push(c.ruleId);
    ruleIdsByCitationId.set(c.id, ids);
  });

  // Multiple rules can produce the same citation; deduplicate by ID
  const citations = uniqBy(rawCitations, "id");

  const questionIcon = <QuestionCircle color="#002238" size={iconSize} />;
  if (citations.length === 1) {
    return (
      <HoverKeepAliveOverlayTrigger
        key={citations[0].url}
        trigger={["hover", "focus"]}
        placement="right"
        flip
        delay={{ show: 250, hide: 500 }}
        citations={citations}
        evaluationResultId={evaluationResultId}
        overlay={(props) => (
          <RuleCitationTooltip {...props}>
            <RuleCitation
              citation={citations[0]}
              evaluationResultId={evaluationResultId}
              ruleIds={ruleIdsByCitationId.get(citations[0].id)}
            />
          </RuleCitationTooltip>
        )}
        rootClose={true}
      >
        <span style={{ verticalAlign: "super", display: "inline-flex" }}>
          {questionIcon}
        </span>
      </HoverKeepAliveOverlayTrigger>
    );
  }

  return (
    <HoverKeepAliveOverlayTrigger
      trigger={["hover", "focus"]}
      placement="right"
      flip
      delay={{ show: 250, hide: 500 }}
      citations={citations}
      evaluationResultId={evaluationResultId}
      overlay={(props) => (
        <RuleCitationTooltip {...props}>
          {citations.map((citation, citationIndex) => (
            <li
              key={citation.id}
              className={`${
                citations.length - 1 != citationIndex ? "mb-3" : ""
              }`}
            >
              <RuleCitation
                key={citation.label + "-" + citationIndex}
                citation={citation}
                evaluationResultId={evaluationResultId}
                ruleIds={ruleIdsByCitationId.get(citation.id)}
              />
            </li>
          ))}
        </RuleCitationTooltip>
      )}
      rootClose={true}
    >
      <span style={{ verticalAlign: "super", display: "inline-flex" }}>
        {questionIcon}
      </span>
    </HoverKeepAliveOverlayTrigger>
  );
}
