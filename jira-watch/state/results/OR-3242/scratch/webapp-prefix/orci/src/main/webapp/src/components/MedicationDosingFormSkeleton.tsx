import "./MedicationDosingFormSkeleton.scss";

import { Skeleton } from "./Skeleton";

export function MedicationDosingFormSkeleton() {
  return (
    <div className="MedicationDosingFormSkeleton border">
      <div className="medication-label">
        <Skeleton height="100%" />
      </div>
      <div className="medication-form">
        <div className="skeleton-row title-row">
          <Skeleton height="1.75rem" width="45%" />
        </div>
        <div className="skeleton-row route-row">
          <Skeleton height="1rem" width="70px" />
          <Skeleton height="2rem" width="90px" />
          <Skeleton height="2rem" width="90px" />
        </div>
        <div className="skeleton-row dose-row">
          <Skeleton height="1rem" width="70px" />
          <Skeleton height="2.5rem" width="110px" />
          <Skeleton height="2.5rem" width="60px" />
          <Skeleton height="2.5rem" width="60px" />
        </div>
        <div className="skeleton-row time-row">
          <Skeleton height="1rem" width="70px" />
          <Skeleton height="2rem" width="140px" />
        </div>
        <div className="row">
          <div className="offset-5 col-7 py-3 skeleton-row button-row">
            <Skeleton height="2.25rem" width="70px" />
            <Skeleton height="1.5rem" width="60px" />
          </div>
        </div>
      </div>
    </div>
  );
}
