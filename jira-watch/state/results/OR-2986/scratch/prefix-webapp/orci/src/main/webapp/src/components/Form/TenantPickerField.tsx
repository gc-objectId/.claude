import { Field } from "formik";
import React from "react";
export const TenantPickerField = ({ name }: { name: string }) => {
  return (
    <Field
      as="select"
      name={name}
      className="form-select"
      style={{ width: "225px" }}
    >
      {/* TODO: filter this list based on logged in user's access */}
      <option value="">Select...</option>
      <option value="mgb-mgh">MGB-MGH</option>
      <option value="mgb-icsnh">MGB-ICSNH</option>
      <option value="demo-demo">Demo Client</option>
    </Field>
  );
};
