import { ReactNode } from "react";
import "./FactList.scss";

export function FactList({ children }: { children: ReactNode }) {
  return <dl className="fact-list">{children}</dl>;
}

export function Fact({
  label,
  wide = false,
  invalid = false,
  children,
}: {
  label: string;
  wide?: boolean;
  invalid?: boolean;
  children: ReactNode;
}) {
  const className = [
    "fact-list__item",
    wide && "fact-list__item--wide",
    invalid && "fact-list__item--invalid",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className}>
      <dt className="guided-eyebrow">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
