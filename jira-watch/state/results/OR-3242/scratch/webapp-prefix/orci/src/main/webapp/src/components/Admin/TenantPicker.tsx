import { Field, useField } from "formik";
import React from "react";
import Select from "react-select";
import { useAuth } from "../../context/AuthContext";
import { isLoggedIn } from "../../types/User";
import { TenantID } from "../../types/identifiers";
import { guidedSelectTheme } from "../Form/guidedSelect";
import "./TenantPicker.scss";

export function useTenantOptions(only?: readonly TenantID[]) {
  const { user } = useAuth();
  if (!isLoggedIn(user) || !user.allowedTenants.length) return [];
  return user.allowedTenants
    .filter((id) => !only || only.includes(id))
    .map((id) => ({
      value: id,
      label: id,
    }));
}

export function MultiTenantPickerFormikField(props: any) {
  const [field, meta, helper] = useField(props.name);
  const tenants = useTenantOptions();
  return (
    <Select
      theme={guidedSelectTheme}
      options={tenants}
      isMulti={true}
      name={field.name}
      value={field.value}
      onChange={(newValue) => helper.setValue(newValue)}
    />
  );
}

export function TenantPickerFormikField({
  only,
  ...props
}: React.ComponentProps<"select"> & { only?: readonly TenantID[] }) {
  const tenants = useTenantOptions(only);
  return (
    <Field as="select" className="form-select tenant-picker" {...props}>
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
  inputId,
}: {
  onChange: (value: TenantID) => void;
  value?: TenantID;
  inputId?: string;
}) {
  const tenants = useTenantOptions();
  return (
    <Select
      inputId={inputId}
      theme={guidedSelectTheme}
      options={tenants}
      value={tenants.find((it) => it.value === value)}
      onChange={(newValue) => {
        if (newValue !== null) onChange(newValue.value as TenantID);
      }}
    />
  );
}
