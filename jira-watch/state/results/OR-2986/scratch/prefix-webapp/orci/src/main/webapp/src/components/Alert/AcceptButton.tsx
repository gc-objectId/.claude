import { Button } from "react-bootstrap";
import { ComponentProps } from "react";
import { Prompt } from "../../types/Prompt";

import { AlertDefinition } from "../../types/AlertDefinition";

export type AcceptButtonProps = {
  onClick(): void;
  alert: AlertDefinition;
  value: ComponentProps<typeof Button>["value"];
};

export function AcceptButton({ onClick, alert, value }: AcceptButtonProps) {
  return (
    <Button
      variant="primary"
      className="text-nowrap alert-response-btn"
      onClick={onClick}
      value={value}
    >
      {alert?.acceptText}
    </Button>
  );
}
