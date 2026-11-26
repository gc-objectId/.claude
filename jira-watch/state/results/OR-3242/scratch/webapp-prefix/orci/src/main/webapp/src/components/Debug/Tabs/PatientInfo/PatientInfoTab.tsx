import { Pencil } from "react-bootstrap-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useHasClickedOutside } from "../../../../hooks/hooks";
import { Formik, useField, useFormikContext } from "formik";
import { PatientController } from "@api";
import { Form, Spinner } from "react-bootstrap";
import { Patient } from "../../../../types/Patient";
import { toHandRolledPatient } from "../../../../types/typeConversions";
import { Fact, FactList } from "../../../Admin/FactList";
import { SectionHeader } from "../../../SectionHeader";
import { cancelOnEscape } from "../../../../utils/keyboard";

export type PatientInfoTabProps = {
  isActive: boolean;
  context: any;
  setPatient(patient: Patient): void;
};

export function PatientInfoTab({ context, setPatient }: PatientInfoTabProps) {
  return (
    <section className="admin-section">
      <SectionHeader title="Patient info" />
      <Formik
        enableReinitialize={true}
        initialValues={{
          dob: context?.patient?.dob,
          gender: context?.patient?.gender,
          height: context?.patient?.height,
          weight:
            context?.patient?.weightValue && context?.patient?.weightUnits
              ? context?.patient?.weightValue +
                " " +
                context?.patient?.weightUnits
              : context?.patient?.weight,
          latestCreatinine: context?.patient?.creatinine,
          pregnant: context?.patient?.pregnant ? "Yes" : "No",
        }}
        onSubmit={async (values, helpers) => {
          const { data, error } = await PatientController.patchPatient({
            path: { patientId: context.patient.pmrn },
            body: {
              dob: values.dob,
              gender: values.gender,
              height: values.height,
              weight: values.weight,
              pregnant:
                values.pregnant !== undefined
                  ? values.pregnant.toLowerCase() === "yes"
                  : undefined,
            },
          });
          if (data) {
            setPatient(toHandRolledPatient(data));
          } else {
            const message = (error as { message?: string } | undefined)
              ?.message;
            try {
              const fields: string[] = JSON.parse(message ?? "");
              fields.forEach((it) => helpers.setFieldError(it, "error"));
            } catch {
              alert("Error updating patient: " + (message ?? "unknown error"));
            }
          }
        }}
      >
        {(props) => (
          <FactList>
            <Fact label="PMRN">{context?.patient?.pmrn}</Fact>
            <Fact label="MRN">{context?.patient?.mrn}</Fact>
            <Fact label="Epic Patient Id" wide>
              {context?.patient?.epicPatientId}
            </Fact>
            <Fact label="Age">{context?.patient?.age}</Fact>
            <EditableFact name="dob" label="DOB" />
            <EditableFact name="gender" label="Gender" />
            <EditableFact name="height" label="Height" />
            <EditableFact name="weight" label="Weight" />
            <EditableFact name="pregnant" label="Pregnant" placeholder="No" />

            {context?.patient?.birthHeight && (
              <Fact label="Birth Height">{context?.patient?.birthHeight}</Fact>
            )}
            {context?.patient?.birthWeight && (
              <Fact label="Birth Weight">{context?.patient?.birthWeight}</Fact>
            )}
            {context?.patient?.gestationalAgeAtBirth && (
              <Fact label="Gestational Age at Birth">
                {context?.patient?.gestationalAgeAtBirth}
              </Fact>
            )}
            {context?.patient?.postmenstrualAge && (
              <Fact label="Postmenstrual Age (PMA)">
                {context?.patient?.postmenstrualAge}
              </Fact>
            )}
            {context?.patient?.pediatricStatus && (
              <Fact label="Pediatric Status">
                {context?.patient?.pediatricStatus}
              </Fact>
            )}
          </FactList>
        )}
      </Formik>
    </section>
  );
}

function EditableValue({
  label,
  onSubmit,
  value,
  submitting,
  error,
  placeholder,
}: {
  label: string;
  value: any;
  onSubmit(val: string): void;
  submitting: boolean;
  error?: string | undefined;
  placeholder?: string;
}) {
  const [mouseOver, setMouseOver] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { hasClickedOutside, reset } = useHasClickedOutside(inputRef);
  const [editingValue, setEditingValue] = useState("");

  const submitEdit = useCallback(() => {
    setEditing(false);
    onSubmit(editingValue);
  }, [editingValue, onSubmit]);
  const cancelEdit = cancelOnEscape(() => setEditing(false));

  useEffect(() => {
    if (hasClickedOutside && editing) {
      submitEdit();
    }
  }, [editing, hasClickedOutside, submitEdit]);

  return (
    <Fact label={error ? `${label} *` : label} invalid={!!error}>
      <div
        role="button"
        className="d-flex align-items-center gap-2 pointer"
        onMouseEnter={() => setMouseOver(true)}
        onMouseLeave={() => setMouseOver(false)}
        onClick={() => {
          setEditing(true);
          reset();
          setEditingValue(value);
          if (!editing) {
            setTimeout(() => {
              inputRef.current?.select();
            });
          }
        }}
      >
        {editing ? (
          <Form.Control
            size="sm"
            value={editingValue}
            placeholder={placeholder}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitEdit();
              cancelEdit(e);
            }}
            ref={inputRef}
          />
        ) : (
          <span>{value || placeholder}</span>
        )}
        {submitting && <Spinner size="sm" />}
        {mouseOver && !editing && <Pencil className="text-secondary" />}
      </div>
    </Fact>
  );
}

function EditableFact(props: {
  name: string;
  label: string;
  placeholder?: string;
}) {
  const { submitForm } = useFormikContext();
  const [field, meta, helpers] = useField(props.name);
  const [submitting, setSubmitting] = useState(false);
  const submit = useCallback(
    (value: string) => {
      if (value != field.value) {
        helpers.setValue(value);
        setSubmitting(true);
        submitForm().finally(() => setSubmitting(false));
      }
    },
    [field.value, helpers, submitForm],
  );
  return (
    <EditableValue
      placeholder={props.placeholder}
      label={props.label}
      value={field.value}
      onSubmit={submit}
      submitting={submitting}
      error={meta.error}
    />
  );
}
