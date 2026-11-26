import { Tooltip } from "react-bootstrap";
import { forwardRef, PropsWithChildren } from "react";

export type RuleCitationTooltipProps = PropsWithChildren<{
  className?: string;
}>;

export const RuleCitationTooltip = forwardRef<
  HTMLDivElement,
  RuleCitationTooltipProps
>(({ className, ...props }, ref) => {
  return (
    <Tooltip
      ref={ref}
      {...props}
      className={(className || "") + " guided-tooltip citation-info"}
    >
      <ul className="list-unstyled mb-0">{props.children}</ul>
    </Tooltip>
  );
});

RuleCitationTooltip.displayName = "RuleCitationTooltip";
