import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Form,
  Spinner,
  Tab,
  Table,
  Tabs,
} from "react-bootstrap";
import { useDebouncedCallback } from "use-debounce";
import { DateTime } from "luxon";
import { CopyableIdentifier } from "../../CopyableIdentifier";
import { JSONView } from "../../JSONView";
import {
  type GetFiredRuleEvaluationsData,
  type GetNotFiredRuleEvaluationsData,
  RuleController,
  type RuleFiredResultDto,
  type ComplianceResultEntry,
  type RuleNotFiredResultDto,
} from "@api";

type RuleEvaluationsTabProps = {
  isActive: boolean;
  caseId: string;
};

type LoadState<T> =
  | { state: "idle"; data: T }
  | { state: "loading" }
  | { state: "error"; message: string };

const DEFAULT_LIMIT = 100;
const MAX_FILTER_LENGTH = 255;

export function RuleEvaluationsTab({
  isActive,
  caseId,
}: RuleEvaluationsTabProps) {
  const [filter, setFilter] = useState("");
  const [fired, setFired] = useState<LoadState<RuleFiredResultDto[]>>({
    state: "idle",
    data: [],
  });
  const [notFired, setNotFired] = useState<LoadState<RuleNotFiredResultDto[]>>({
    state: "idle",
    data: [],
  });

  const loadData = useDebouncedCallback(
    async (ruleIdentifierFilter: string) => {
      setFired({ state: "loading" });
      setNotFired({ state: "loading" });
      type RuleEvaluationQuery = GetFiredRuleEvaluationsData["query"] &
        GetNotFiredRuleEvaluationsData["query"];

      const baseQuery: RuleEvaluationQuery = {
        caseId,
        limit: DEFAULT_LIMIT,
      };
      const query: RuleEvaluationQuery = ruleIdentifierFilter
        ? { ...baseQuery, ruleIdentifier: ruleIdentifierFilter }
        : baseQuery;

      const firedResponse = await RuleController.getFiredRuleEvaluations({
        query,
      });
      if ("error" in firedResponse && firedResponse.error) {
        setFired({
          state: "error",
          message: String(firedResponse.error),
        });
      } else {
        setFired({
          state: "idle",
          data: (firedResponse as { data?: RuleFiredResultDto[] }).data ?? [],
        });
      }

      const notFiredResponse = await RuleController.getNotFiredRuleEvaluations({
        query,
      });
      if ("error" in notFiredResponse && notFiredResponse.error) {
        setNotFired({
          state: "error",
          message: String(notFiredResponse.error),
        });
      } else {
        setNotFired({
          state: "idle",
          data:
            (notFiredResponse as { data?: RuleNotFiredResultDto[] }).data ?? [],
        });
      }
    },
    300,
  );

  useEffect(() => {
    if (isActive) {
      loadData(filter);
    }
  }, [isActive, loadData, filter]);

  const firedRows = useMemo(
    () => (fired.state === "idle" ? fired.data : []),
    [fired],
  );

  const notFiredRows = useMemo(
    () => (notFired.state === "idle" ? notFired.data : []),
    [notFired],
  );

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Form.Control
          size="sm"
          placeholder="Filter by Rule Identifier"
          value={filter}
          maxLength={MAX_FILTER_LENGTH}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => {
            loadData(filter);
            loadData.flush();
          }}
        >
          Refresh
        </Button>
      </div>

      <Tabs
        defaultActiveKey="fired"
        id="rule-evaluations-tabs"
        className="mb-3"
      >
        <Tab eventKey="fired" title="Firings">
          {renderState(fired, "No firings", () => (
            <RuleFiredTable rows={firedRows} />
          ))}
        </Tab>
        <Tab eventKey="not-fired" title="Not Fired">
          {renderState(notFired, "No not-fired entries", () => (
            <RuleNotFiredTable rows={notFiredRows} />
          ))}
        </Tab>
      </Tabs>
    </div>
  );
}

function renderState<T>(
  state: LoadState<T>,
  emptyText: string,
  render: () => React.ReactNode,
) {
  if (state.state === "loading") {
    return (
      <div className="d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" /> Loading...
      </div>
    );
  }
  if (state.state === "error") {
    return <div className="text-danger">Failed to load: {state.message}</div>;
  }
  const content = render();
  if (
    Array.isArray((state as { data: unknown }).data) &&
    ((state as { data: unknown[] }).data?.length ?? 0) === 0
  ) {
    return <div>{emptyText}</div>;
  }
  return content;
}

function RuleFiredTable({ rows }: { rows: RuleFiredResultDto[] }) {
  return (
    <Table striped bordered hover size="sm">
      <thead>
        <tr>
          <th>ID</th>
          <th>Rule Identifier</th>
          <th>Created</th>
          <th>Trigger</th>
          <th>Responder</th>
          <th>Status</th>
          <th>Compliant?</th>
          <th>Rejection</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.id ? <CopyableIdentifier value={row.id} /> : "--"}</td>
            <td>{row.ruleIdentifier}</td>
            <td>{formatDate(row.createdDate)}</td>
            <td>{row.trigger}</td>
            <td>{row.responderName || "--"}</td>
            <td>
              <StatusBadges
                suppressed={!!row.suppressed}
                accepted={row.accepted}
              />
            </td>
            <td>
              <ComplianceCell entries={row.complianceResults} />
            </td>
            <td>
              {row.rejectionReasonOption || row.rejectionReason
                ? `${row.rejectionReasonOption ?? ""} ${
                    row.rejectionReason ?? ""
                  }`.trim()
                : "--"}
            </td>
            <td>
              <JSONView data={row.details} />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function RuleNotFiredTable({ rows }: { rows: RuleNotFiredResultDto[] }) {
  return (
    <Table striped bordered hover size="sm">
      <thead>
        <tr>
          <th>ID</th>
          <th>Rule Identifier</th>
          <th>Created</th>
          <th>Explanation</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.id ? <CopyableIdentifier value={row.id} /> : "--"}</td>
            <td>{row.ruleIdentifier}</td>
            <td>{formatDate(row.createdDate)}</td>
            <td>{row.explanation || "--"}</td>
            <td>
              <JSONView data={row.details} />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function ComplianceCell({
  entries,
}: {
  entries?: Array<ComplianceResultEntry>;
}) {
  if (!entries || entries.length === 0) {
    return <>--</>;
  }
  return (
    <span>
      {entries.map((entry, i) => (
        <span key={entry.label ?? i}>
          {i > 0 && "  "}
          {entry.label}:{" "}
          {entry.compliant == null ? "?" : entry.compliant ? "✓" : "✗"}
        </span>
      ))}
    </span>
  );
}

function StatusBadges({
  suppressed,
  accepted,
}: {
  suppressed: boolean;
  accepted?: boolean;
}) {
  return (
    <div className="d-flex gap-1">
      {suppressed && <Badge bg="warning">Suppressed</Badge>}
      {accepted === true && <Badge bg="success">Accepted</Badge>}
      {accepted === false && <Badge bg="danger">Rejected</Badge>}
      {accepted === undefined && <Badge bg="secondary">Pending</Badge>}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "--";
  }
  return DateTime.fromISO(value).toLocaleString(
    DateTime.DATETIME_SHORT_WITH_SECONDS,
  );
}
