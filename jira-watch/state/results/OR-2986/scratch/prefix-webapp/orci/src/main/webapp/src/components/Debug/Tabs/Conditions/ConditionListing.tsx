import { Button, Table } from "react-bootstrap";
import type { PatientConditionDto } from "@api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { sortBy } from "lodash";

export type ConditionListingProps = {
  conditions: PatientConditionDto[];
  onDelete(condition: PatientConditionDto): void;
};

export function ConditionListing({
  conditions,
  onDelete,
}: ConditionListingProps) {
  return (
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>Condition ID</th>
          <th>Tags</th>
          <th>Onset Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {sortBy(conditions, (it) => it.conditionId).map((condition) => {
          return (
            <tr key={condition.uuid}>
              <td>{condition.conditionId}</td>
              <td>{condition.tags.join(",")}</td>
              <td>
                {condition.onsetDate &&
                  new Date(condition.onsetDate).toLocaleString()}
              </td>
              <td>
                <Button variant="secondary" onClick={() => onDelete(condition)}>
                  <FontAwesomeIcon icon={faTrash} />
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
