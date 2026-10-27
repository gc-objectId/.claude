import BSForm from "react-bootstrap/Form";
import { useField } from "formik";
import { omit } from "lodash";

export function BootstrapField(props: any) {
  const [field, meta, helpers] = useField(props.name);
  const p = omit(props, "name");
  return <BSForm.Control {...field} {...p} />;
}
