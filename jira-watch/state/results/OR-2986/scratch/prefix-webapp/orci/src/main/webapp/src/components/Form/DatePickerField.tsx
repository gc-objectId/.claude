import React, { useEffect } from "react";
import { useField, useFormikContext } from "formik";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { isString } from "lodash";

export const DatePickerField = ({ ...props }) => {
  const { setFieldValue } = useFormikContext();
  // @ts-ignore
  const [field, meta, helpers] = useField(props);
  useEffect(() => {
    if (isString(field.value)) {
      if (field.value) {
        helpers.setValue(new Date(field.value));
      } else {
        helpers.setValue(null);
      }
    }
  }, [field.value, helpers]);
  return (
    <DatePicker
      {...field}
      {...props}
      selected={(field.value && new Date(field.value)) || null}
      onChange={(val) => {
        setFieldValue(field.name, val);
      }}
    />
  );
};
