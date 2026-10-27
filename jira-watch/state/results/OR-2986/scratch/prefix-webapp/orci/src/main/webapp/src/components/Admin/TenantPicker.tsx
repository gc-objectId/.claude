import { Field, useField } from "formik";
import React from "react";
import Select from "react-select";
import { useAuth } from "../../context/AuthContext";
import { isLoggedIn } from "../../types/User";
import { TenantID } from "../../types/identifiers";

function useTenantOptions() {
  const { user } = useAuth();
  if (!isLoggedIn(user) || !user.allowedTenants.length) return [];
  return user.allowedTenants.map((id) => ({
    value: id,
    label: id,
  }));
}

export function MultiTenantPickerFormikField(props: any) {
  const [field, meta, helper] = useField(props.name);
  const tenants = useTenantOptions();
  return (
    <Select
      options={tenants}
      isMulti={true}
      name={field.name}
      value={field.value}
      onChange={(newValue) => helper.setValue(newValue)}
    />
  );
}

export function TenantPickerFormikField(props: React.ComponentProps<"select">) {
  const tenants = useTenantOptions();
  return (
    <Field
      as="select"
      style={{ width: "225px" }}
      className="form-select"
      {...props}
    >
      <option value="">Select...</option>
      {tenants.map((it) => (
        <option value={it.value} key={it.value}>
          {it.label}
        </option>
      ))}
    </Field>
  );
}

export function TenantPicker({
  onChange,
  value,
}: {
  onChange: (value: TenantID) => void;
  value?: TenantID;
}) {
  const tenants = useTenantOptions();
  return (
    <Select
      options={tenants}
      value={tenants.find((it) => it.value === value)}
      onChange={(newValue) => {
        if (newValue !== null) onChange(newValue.value as TenantID);
      }}
    />
  );
}
