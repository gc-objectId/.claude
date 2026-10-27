import { Button, Spinner } from "react-bootstrap";
import {
  ComponentProps,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useState,
} from "react";

export function AsyncButton(
  props: Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
    onClick: () => Promise<any> | undefined;
    children?: (working: boolean) => ReactNode | undefined;
  },
) {
  const [working, setWorking] = useState(false);
  const cb = useCallback(async () => {
    if (props.onClick) {
      setWorking(true);
      await props.onClick();
      setWorking(false);
    }
  }, [props]);
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
    <AsyncButton onClick={() => props.onClick()} {...props}>
      {(working) => (working ? <Spinner size={props.size} /> : props.children)}
    </AsyncButton>
  );
}
