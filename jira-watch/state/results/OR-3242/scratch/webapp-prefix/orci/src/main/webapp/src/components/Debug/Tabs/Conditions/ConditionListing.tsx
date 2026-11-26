import { Button } from "react-bootstrap";
import type { PatientConditionDto } from "@api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { sortBy } from "lodash";
import { AdminTable } from "../../../Admin/AdminTable";

export type ConditionListingProps = {
  conditions: PatientConditionDto[];
  onDelete(condition: PatientConditionDto): void;
};

export function ConditionListing({
  conditions,
  onDelete,
}: ConditionListingProps) {
  return (
    <AdminTable>
      <thead>
        <tr>
          <th>Condition ID</th>
          <th>Tags</th>
          <th>Onset Date</th>
          <th>
            <span className="visually-hidden">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {sortBy(conditions, (it) => it.conditionId).map((condition) => {
          return (
            <tr key={condition.uuid}>
              <td>{condition.conditionId}</td>
              <td>
                <div className="admin-table__tags">
                  {condition.tags.map((tag) => (
                    <span key={tag} className="guided-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td>
                {condition.onsetDate &&
                  new Date(condition.onsetDate).toLocaleString()}
              </td>
              <td>
                <div className="admin-table__actions">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="admin-icon-button"
                    title="Delete condition"
                    onClick={() => onDelete(condition)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </AdminTable>
  );
}
