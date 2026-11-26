import { ReactNode } from "react";

export function SectionHeader({
  title,
  actions,
}: {
  title: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="guided-section-header">
      <h2 className="guided-section-title">{title}</h2>
      {actions}
    </div>
  );
}
