import { Pencil } from "react-bootstrap-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useHasClickedOutside, useKeyPressed } from "../../../../hooks/hooks";
import { Formik, useField, useFormikContext } from "formik";
import { PatientController } from "@api";
import { Spinner } from "react-bootstrap";
import { Patient } from "../../../../types/Patient";
import { toHandRolledPatient } from "../../../../types/typeConversions";

export type PatientInfoTabProps = {
  isActive: boolean;
  context: any;
  setPatient(patient: Patient): void;
};

export function PatientInfoTab({ context, setPatient }: PatientInfoTabProps) {
  return (
    <div>
      <h3>Patient info</h3>
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
          <dl className="row">
            <ReadonlyRowField label="PMRN" value={context?.patient?.pmrn} />
            <ReadonlyRowField label="MRN" value={context?.patient?.mrn} />
            <ReadonlyRowField
              label="Epic Patient Id"
              value={context?.patient?.epicPatientId}
            />
            <ReadonlyRowField label="Age" value={context?.patient?.age} />
            <EditableRowField name="dob" label="DOB" />
            <EditableRowField name="gender" label="Gender" />
            <EditableRowField name="height" label="Height" />
            <EditableRowField name="weight" label="Weight" />
            <EditableRowField
              name="pregnant"
              label="Pregnant"
              placeholder="No"
            />

            {context?.patient?.birthHeight && (
              <ReadonlyRowField
                label="Birth Height"
                value={context?.patient?.birthHeight}
              />
            )}
            {context?.patient?.birthWeight && (
              <ReadonlyRowField
                label="Birth Weight"
                value={context?.patient?.birthWeight}
              />
            )}
            {context?.patient?.gestationalAgeAtBirth && (
              <ReadonlyRowField
                label="Gestational Age at Birth"
                value={context?.patient?.gestationalAgeAtBirth}
              />
            )}
            {context?.patient?.postmenstrualAge && (
              <ReadonlyRowField
                label="Postmenstrual Age (PMA)"
                value={context?.patient?.postmenstrualAge}
              />
            )}
            {context?.patient?.pediatricStatus && (
              <ReadonlyRowField
                label="Pediatric Status"
                value={context?.patient?.pediatricStatus}
              />
            )}
          </dl>
        )}
      </Formik>
    </div>
  );
}

function ReadonlyRowField(props: { label: string; value: string }) {
  return (
    <div className="row">
      <dt className="col-3">{props.label}</dt>
      <dd className="col-9">{props.value}</dd>
    </div>
  );
}

function EditableRow({
  name,
  onSubmit,
  value,
  submitting,
  error,
  placeholder,
}: {
  name: string;
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
  const escPressed = useKeyPressed("Escape");
  const enterPressed = useKeyPressed("Enter");
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    if ((hasClickedOutside || escPressed || enterPressed) && editing) {
      setEditing(false);
      if (!escPressed) {
        onSubmit(editingValue);
      }
    }
  }, [
    editing,
    hasClickedOutside,
    escPressed,
    editingValue,
    enterPressed,
    onSubmit,
  ]);

  return (
    <div className="row">
      <dt className="col-3" style={{ color: error ? "red" : "inherit" }}>
        {name}
        {error && "*"}
      </dt>
      <dd
        className="col-9"
        onMouseEnter={() => setMouseOver(true)}
        onMouseLeave={() => setMouseOver(false)}
      >
        <div
          style={{ minHeight: "1lh" }}
          className="row"
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
          <div className="col-2">
            {editing ? (
              <input
                style={{ height: "1lh" }}
                value={editingValue}
                placeholder={placeholder}
                onChange={(e) => setEditingValue(e.target.value)}
                ref={inputRef}
              />
            ) : (
              <span>{value || placeholder}</span>
            )}
            {submitting && (
              <div className="d-inline-block ms-2">
                <Spinner size="sm" />
              </div>
            )}
          </div>
          <div className="col-1">{mouseOver && !editing && <Pencil />}</div>
        </div>
      </dd>
    </div>
  );
}

function EditableRowField(props: {
  name: string;
  label?: string;
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
    <>
      <EditableRow
        placeholder={props.placeholder}
        name={props.label || ""}
        value={field.value}
        onSubmit={submit}
        submitting={submitting}
        error={meta.error}
      />
    </>
  );
}
