import { Citation } from "../../types/Citation";
import { isElementNode, sanitizedHtml } from "../../utils/markup";
import { EventType } from "../../services/TrackingEventService";
import { useAppQueryParams } from "../../hooks/hooks";
import { AlertResultID } from "../../types/identifiers";
import { useTrackingEvent } from "../../hooks/useTrackingEvent";
import React, { useMemo } from "react";
import parse, { domToReact } from "html-react-parser";
import DOMPurify from "dompurify";
import { ChevronDown, ChevronUp } from "react-bootstrap-icons";

export type RuleCitationProps = {
  citation: Citation;
  evaluationResultId?: AlertResultID;
  ruleIds?: string[];
};
const EXPAND_PLACEHOLDER = "expandable";
export function RuleCitation({
  citation,
  evaluationResultId,
  ruleIds,
}: RuleCitationProps) {
  const { patientId, caseId } = useAppQueryParams();
  const { recordEvent } = useTrackingEvent(patientId, caseId);

  const handleCitationClick = () => {
    // Track citation link click event
    recordEvent(EventType.CITATION_LINK_CLICK, {
      evaluationResultId: evaluationResultId,
      citationId: citation.id,
      citationURL: citation.url,
    });
  };

  const citationHtml = useMemo(() => {
    return parse(
      DOMPurify.sanitize(citation.citation || "", {
        ADD_TAGS: [
          EXPAND_PLACEHOLDER,
          "math",
          "mrow",
          "msup",
          "mn",
          "mo",
          "mtext",
          "mfrac",
        ],
      }),
      {
        replace: (domNode) => {
          if (isElementNode(domNode)) {
            if (domNode.name === EXPAND_PLACEHOLDER.toLowerCase()) {
              return (
                <ToggleableContent
                  title={domNode.attribs["title"]}
                  content={domToReact(domNode.children)}
                />
              );
            }
          }
        },
      },
    );
  }, [citation.citation]);

  return (
    <>
      <a
        href={citation?.url}
        target="_blank"
        rel="noreferrer"
        onClick={handleCitationClick}
        data-rule-ids={ruleIds?.join(" ")}
      >
        <span dangerouslySetInnerHTML={sanitizedHtml(citation?.label)}></span>
      </a>
      <br />
      <div>{citationHtml}</div>
    </>
  );
}

function ToggleableContent({
  title,
  content,
}: {
  title: string;
  content: any;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="my-2">
      <div className="link-primary pointer" onClick={() => setIsOpen(!isOpen)}>
        {title}
        {isOpen ? (
          <ChevronUp className="ms-1" />
        ) : (
          <ChevronDown className="ms-1" />
        )}
      </div>
      {isOpen && <div>{content}</div>}
    </div>
  );
}
