import { Button, Col, Form, Row } from "react-bootstrap";
import type { ConditionId, PatientConditionDto } from "@api";
import { useState } from "react";
import { DateTime } from "luxon";

export type AddConditionFormProps = {
  onAdd(condition: Omit<PatientConditionDto, "uuid">): void;
};

export function AddConditionForm({ onAdd }: AddConditionFormProps) {
  const [condition, setCondition] = useState<ConditionId>();
  const [tags, setTags] = useState("");
  const [onsetDate, setOnsetDate] = useState("");
  const [onsetTime, setOnsetTime] = useState("");
  return (
    <Form
      className="mb-3"
      onSubmit={(e) => {
        e.preventDefault();
        const [hour, minute] = onsetTime.split(":").map(Number);
        let date: string | undefined = undefined;
        try {
          date = DateTime.fromFormat(onsetDate, "yyyy-MM-dd")
            .set({
              hour,
              minute,
            })
            .toJSDate()
            .toISOString();
        } catch {}

        if (condition) {
          onAdd({
            conditionId: condition,
            onsetDate: date,
            tags: tags.split(","),
          });
        }
      }}
    >
      <Row>
        <Form.Group className="mb-3" as={Col} controlId="condition">
          <Form.Label>Condition ID</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter condition id"
            value={condition}
            onChange={(e) => setCondition(e.target.value as ConditionId)}
          />
        </Form.Group>
      </Row>
      <Row>
        <Form.Group className="mb-3" as={Col} controlId="conditionSets">
          <Form.Label>Condition Tags</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3" as={Col} controlId="onsetDate">
          <Form.Label>Onset Date</Form.Label>
          <Form.Control
            type="date"
            placeholder="Onset Date"
            value={onsetDate}
            onChange={(e) => setOnsetDate(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3" as={Col} controlId="onsetTime">
          <Form.Label>Onset Time</Form.Label>
          <Form.Control
            type="time"
            placeholder="Onset Time"
            value={onsetTime}
            onChange={(e) => setOnsetTime(e.target.value)}
          />
        </Form.Group>
      </Row>
      <Button type="submit">Add Condition</Button>
    </Form>
  );
}
