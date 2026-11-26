import { Form } from "react-bootstrap";
import { TenantID } from "../../types/identifiers";
import { TenantPicker } from "./TenantPicker";

export function TenantScope({
  value,
  onChange,
}: {
  value?: TenantID;
  onChange: (value: TenantID) => void;
}) {
  return (
    <Form.Group className="admin-scope">
      <Form.Label htmlFor="tenant-scope" className="guided-eyebrow">
        Tenant
      </Form.Label>
      <TenantPicker inputId="tenant-scope" value={value} onChange={onChange} />
    </Form.Group>
  );
}
