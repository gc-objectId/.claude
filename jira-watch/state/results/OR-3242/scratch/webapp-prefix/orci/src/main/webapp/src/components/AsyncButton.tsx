import { Button, Spinner } from "react-bootstrap";
import {
  ComponentProps,
  MouseEvent,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useState,
} from "react";

export function AsyncButton(
  props: Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
    onClick: (event: MouseEvent<HTMLButtonElement>) => Promise<any> | undefined;
    children?: (working: boolean) => ReactNode | undefined;
  },
) {
  const [working, setWorking] = useState(false);
  const cb = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      if (props.onClick) {
        setWorking(true);
        try {
          await props.onClick(event);
        } finally {
          setWorking(false);
        }
      }
    },
    [props],
  );
  return (
    <Button {...props} onClick={cb}>
      {props.children?.(working)}
    </Button>
  );
}

export function AsyncSpinnerButton(
  props: PropsWithChildren<
    Omit<ComponentProps<typeof AsyncButton>, "children">
  >,
) {
  return (
    <AsyncButton onClick={(event) => props.onClick(event)} {...props}>
      {(working) => (working ? <Spinner size={props.size} /> : props.children)}
    </AsyncButton>
  );
}
