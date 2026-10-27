import React, { useCallback, useEffect, useState } from "react";
import {
  isLoaded,
  isLoading,
  Loadable,
  loading,
} from "../../../../types/Loadable";
import { Alert, Button, Spinner, Table } from "react-bootstrap";
import type { RuleDefinitionDto, RuleLockoutStatus } from "@api";
import { RuleController } from "@api";
import { EditAntibioticRedoseConfiguration } from "./EditAntibioticRedoseConfiguration";
import { EditRuleConfiguration } from "./EditRuleConfiguration";
import { ApplicationLaunchContext } from "../../../../types/ApplicationLaunchContext";
import { now } from "lodash";
import Stack from "react-bootstrap/Stack";

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

          <Table striped bordered hover>
            <thead>
              <tr>
                <th>ID</th>
                <th>Description</th>
                <th>Type</th>
                <th>Trigger</th>
                <th>Lockout</th>
                <th>Action</th>
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
                  <Stack gap={3}>
                    {isConfigurable(ruleDefinition.configBehavior) && (
                      <Button
                        variant="info"
                        onClick={() => setEditingRule(ruleDefinition)}
                      >
                        Edit
                      </Button>
                    )}
                    {expiryTime && (
                      <Button
                        variant="warning"
                        onClick={() => clearLockout(ruleDefinition.id)}
                      >
                        Clear lockout
                      </Button>
                    )}
                  </Stack>
                );
                return (
                  <tr key={ruleDefinition.id}>
                    <td>{ruleDefinition.id}</td>
                    <td>{ruleDefinition.description}</td>
                    <td>{ruleDefinition.type}</td>
                    <td>{ruleDefinition.trigger}</td>
                    <td>
                      {Number(secondsTillReeligible) > 0
                        ? `${secondsTillReeligible}s remaining`
                        : ""}
                    </td>
                    <th>{editAction}</th>
                  </tr>
                );
              })}
            </tbody>
          </Table>
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
