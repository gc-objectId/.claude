import { Tooltip } from "react-bootstrap";
import { forwardRef, PropsWithChildren } from "react";

export type RuleCitationTooltipProps = PropsWithChildren<{
  className?: string;
}>;

export const WeightDoseCalculationTooltip = forwardRef<
  HTMLDivElement,
  RuleCitationTooltipProps
>(({ className, ...props }, ref) => {
  return (
    <Tooltip
      ref={ref}
      {...props}
      className={(className || "") + " guided-tooltip weight-dose-calculation"}
    >
      <ul className="list-unstyled mb-0">{props.children}</ul>
    </Tooltip>
  );
});

WeightDoseCalculationTooltip.displayName = "WeightDoseCalculationTooltip";
