import React, { useCallback, useEffect, useState } from "react";
import {
  isLoaded,
  isLoading,
  Loadable,
  loading,
} from "../../../../types/Loadable";
import { Alert, Button, Spinner } from "react-bootstrap";
import { AdminTable } from "../../../Admin/AdminTable";
import type { RuleDefinitionDto, RuleLockoutStatus } from "@api";
import { RuleController } from "@api";
import { EditAntibioticRedoseConfiguration } from "./EditAntibioticRedoseConfiguration";
import { EditRuleConfiguration } from "./EditRuleConfiguration";
import { ApplicationLaunchContext } from "../../../../types/ApplicationLaunchContext";
import { now } from "lodash";

export type RuleManagementProps = {
  context: ApplicationLaunchContext;
  isActive: boolean;
};

function isConfigurable(configBehavior: RuleDefinitionDto["configBehavior"]) {
  return configBehavior !== "NOT_CONFIGURABLE" && configBehavior !== "NONE";
}

export function RuleManagementTab({ context, isActive }: RuleManagementProps) {
  const [editingRule, setEditingRule] = useState<RuleDefinitionDto | null>(
    null,
  );

  const [editMessage, setEditMessage] = useState("");

  const [ruleDefinitions, setRuleDefinitions] = useState<
    Loadable<Array<RuleDefinitionDto>>
  >(loading());

  const [timeOfRecentlyFiredStateFetch, setTimeOfRecentlyFiredStateFetch] =
    useState(now());
  const [recentlyFiredState, setRecentlyFiredState] = useState<
    Loadable<RuleLockoutStatus[]>
  >(loading());

  const loadRuleDefinitions = useCallback(async () => {
    setRuleDefinitions(loading());
    const { data } = await RuleController.getRuleDefinitions1({});
    setRuleDefinitions(data ?? []);
  }, []);

  const loadCacheState = useCallback(async () => {
    setRecentlyFiredState(loading());
    const { data } = await RuleController.getRecentlyFiredStatusForPatientId({
      path: { patientId: context.patient.id },
    });
    setTimeOfRecentlyFiredStateFetch(now());
    setRecentlyFiredState(data ?? []);
  }, [context.patient.id]);

  const clearLockout = useCallback(
    async (ruleId: string) => {
      await RuleController.clearRecentlyFiredStatus({
        path: {
          ruleId,
          operationId: context.operation.operationId,
          patientId: context.patient.id,
        },
      });
      await loadCacheState();
    },
    [context.operation.operationId, context.patient.id, loadCacheState],
  );
  useEffect(() => {
    if (isActive) {
      loadRuleDefinitions();
      loadCacheState();
    }
  }, [isActive, loadCacheState, loadRuleDefinitions]);

  const handleClose = (message: string) => {
    setEditingRule(null);
    setEditMessage(message);
  };

  useEffect(() => {
    if (editMessage) {
      setTimeout(() => {
        setEditMessage("");
      }, 3000);
    }
  }, [editMessage]);

  return (
    <div>
      {isLoading(ruleDefinitions) ? (
        <Spinner />
      ) : (
        <div>
          {editMessage && <Alert variant="success">{editMessage}</Alert>}

          <AdminTable>
            <thead>
              <tr>
                <th>ID</th>
                <th>Description</th>
                <th>Type</th>
                <th>Trigger</th>
                <th>Lockout</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ruleDefinitions.map((ruleDefinition) => {
                const expiryTime =
                  isLoaded(recentlyFiredState) &&
                  recentlyFiredState.find(
                    (it) => it.ruleName === ruleDefinition.id,
                  )?.expirySeconds;
                const secondsTillReeligible =
                  expiryTime &&
                  Math.floor(
                    expiryTime - (now() - timeOfRecentlyFiredStateFetch) / 1000,
                  );
                let editAction = (
                  <div className="admin-table__actions">
                    {isConfigurable(ruleDefinition.configBehavior) && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setEditingRule(ruleDefinition)}
                      >
                        Edit
                      </Button>
                    )}
                    {expiryTime && (
                      <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={() => clearLockout(ruleDefinition.id)}
                      >
                        Clear lockout
                      </Button>
                    )}
                  </div>
                );
                return (
                  <tr key={ruleDefinition.id}>
                    <td>
                      <span className="admin-code">{ruleDefinition.id}</span>
                    </td>
                    <td>{ruleDefinition.description}</td>
                    <td>
                      <span className="guided-tag">{ruleDefinition.type}</span>
                    </td>
                    <td>
                      <span className="guided-tag">
                        {ruleDefinition.trigger}
                      </span>
                    </td>
                    <td>
                      {Number(secondsTillReeligible) > 0
                        ? `${secondsTillReeligible}s remaining`
                        : ""}
                    </td>
                    <td>{editAction}</td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
          {editingRule?.configBehavior === "ANTIBIOTIC_REDOSE" && (
            <EditAntibioticRedoseConfiguration
              show={true}
              handleClose={handleClose}
            />
          )}
          {editingRule?.configBehavior === "FIELD_EDITOR" && (
            <EditRuleConfiguration
              show={true}
              ruleIdentifier={editingRule.id}
              handleClose={handleClose}
            />
          )}
        </div>
      )}
    </div>
  );
}
