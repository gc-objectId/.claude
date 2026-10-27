import React, { useCallback, useState } from "react";
import { Button } from "react-bootstrap";

function serializeNode(node: Node, depth: number): string {
  const indent = "  ".repeat(depth);

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim() ?? "";
    return text ? indent + text : "";
  }

  if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
    const pi = node as ProcessingInstruction;
    return `${indent}<?${pi.target} ${pi.data}?>`;
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    return `${indent}<!--${node.textContent}-->`;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const el = node as Element;
  const tag = el.tagName;
  const attrs = Array.from(el.attributes)
    .map((a) => ` ${a.name}="${a.value}"`)
    .join("");

  const children = Array.from(el.childNodes);

  if (children.length === 0) {
    return `${indent}<${tag}${attrs}/>`;
  }

  // Inline single text-only children
  if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
    const text = children[0].textContent?.trim() ?? "";
    return text
      ? `${indent}<${tag}${attrs}>${text}</${tag}>`
      : `${indent}<${tag}${attrs}/>`;
  }

  const childLines = children
    .map((child) => serializeNode(child, depth + 1))
    .filter((s) => s !== "");

  return [
    `${indent}<${tag}${attrs}>`,
    ...childLines,
    `${indent}</${tag}>`,
  ].join("\n");
}

function formatXml(xml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) return xml;

  return Array.from(doc.childNodes)
    .map((node) => serializeNode(node, 0))
    .filter((s) => s !== "")
    .join("\n");
}

function isXml(value: string): boolean {
  return /^\s*</.test(value);
}

type Props = {
  data: string;
};

export function XmlOrRawDisplay({ data }: Props) {
  const [formatted, setFormatted] = useState(false);
  const [copied, setCopied] = useState(false);

  const xml = isXml(data);
  const displayed = xml && formatted ? formatXml(data) : data;

  const copy = useCallback(() => {
    navigator.clipboard.writeText(displayed).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [displayed]);

  return (
    <div>
      <div className="d-flex gap-2 mb-2">
        {xml && (
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => setFormatted((f) => !f)}
          >
            {formatted ? "Show raw" : "Format XML"}
          </Button>
        )}
        <Button size="sm" variant="outline-secondary" onClick={copy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          maxHeight: "400px",
          overflowY: "auto",
        }}
      >
        {displayed}
      </pre>
    </div>
  );
}
