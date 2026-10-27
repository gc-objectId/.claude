import parse, { DOMNode, Element } from "html-react-parser";
import DOMPurify from "dompurify";
import { RuleCitationContainer } from "../components/Alert/RuleCitationContainer";
import React from "react";
import { Citation } from "../types/Citation";
import { AlertResultID } from "../types/identifiers";

const CITATION_PLACEHOLDER = "Citation";

export function templateHTML(
  content: string,
  evaluationResultId: AlertResultID,
  citations?: Citation[],
) {
  return parse(
    DOMPurify.sanitize(content, {
      ADD_TAGS: [CITATION_PLACEHOLDER],
    }),
    {
      replace: (domNode) => {
        if (isElementNode(domNode)) {
          if (
            domNode.name === CITATION_PLACEHOLDER.toLowerCase() &&
            citations
          ) {
            return (
              <RuleCitationContainer
                citations={citations}
                evaluationResultId={evaluationResultId}
              />
            );
          }
        }
      },
    },
  );
}

export const sanitizedHtml = (text: string | null) => ({
  __html: DOMPurify.sanitize(text || ""),
});

export function isElementNode(domNode: DOMNode): domNode is Element {
  return domNode.type === "tag";
}
