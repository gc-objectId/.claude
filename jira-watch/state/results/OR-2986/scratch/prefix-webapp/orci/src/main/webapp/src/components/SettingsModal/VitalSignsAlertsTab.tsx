import { isLoading, Loadable } from "../../types/Loadable";
import type { VitalSignSettingsDto } from "@api";
import { RuleID } from "../../types/identifiers";
import { Col, Form, OverlayTrigger, Spinner, Tooltip } from "react-bootstrap";
import { sortBy } from "lodash";
import React from "react";
import { SettingsModalProps } from "./SettingsModal";

export function VitalSignAlertsTab(props: {
  onChanged: (checked: boolean) => void;
  checked: boolean;
  ruleSettings: Loadable<VitalSignSettingsDto[]>;
  updateSuppressionSetting: (ruleIds: RuleID[], suppressed: boolean) => void;
}) {
  return (
    <Form className="mt-3">
      <VitalSignOptIn onChanged={props.onChanged} checked={props.checked} />
      <EnableOrDisableAlerts
        notifyOnVitalSignAlerts={props.checked}
        ruleSettings={props.ruleSettings}
        updateSuppressionSetting={props.updateSuppressionSetting}
      />
    </Form>
  );
}

function EnableOrDisableAlerts({
  ruleSettings,
  updateSuppressionSetting,
  notifyOnVitalSignAlerts,
}: Pick<
  SettingsModalProps,
  "ruleSettings" | "updateSuppressionSetting" | "notifyOnVitalSignAlerts"
>) {
  return (
    <fieldset>
      <Form.Group style={{ marginLeft: "12px" }}>
        <Form.Label as="legend" column>
          Enable individual alerts
        </Form.Label>
        {isLoading(ruleSettings) ? (
          <Spinner />
        ) : (
          sortBy(ruleSettings, (it) => it.toggleName).map((setting, i) => (
            <Col
              key={setting.toggleName}
              style={{
                paddingLeft: "11px",
                paddingRight: "11px",
                paddingTop: "8px",
                margin: "0",
              }}
            >
              <Form.Switch
                id={`toggle-rule-${setting.ruleIds.join("--")}`}
                label={
                  setting.longDescription === "" ? (
                    setting.toggleName
                  ) : (
                    <OverlayTrigger
                      placement="right"
                      delay={250}
                      overlay={
                        <Tooltip style={{ whiteSpace: "pre-wrap" }}>
                          {setting.longDescription}
                        </Tooltip>
                      }
                    >
                      <div>{setting.toggleName}</div>
                    </OverlayTrigger>
                  )
                }
                onClick={() =>
                  updateSuppressionSetting(setting.ruleIds, !setting.suppressed)
                }
                checked={notifyOnVitalSignAlerts && !setting.suppressed}
                disabled={!notifyOnVitalSignAlerts}
              />
            </Col>
          ))
        )}
      </Form.Group>
    </fieldset>
  );
}

function VitalSignOptIn(props: {
  onChanged: (checked: boolean) => void;
  checked: boolean;
}) {
  return (
    <Form.Group
      className="mb-3 pb-3"
      style={{ borderBottom: "1px solid lightgrey" }}
    >
      <Col
        style={{
          paddingLeft: "22px",
          paddingRight: "11px",
          margin: "0",
        }}
      >
        <Form.Switch
          id="vital-sign-alerts-opt-in"
          label="Enable vital sign alerts for this case"
          onClick={(e) =>
            props.onChanged((e.target as HTMLInputElement).checked)
          }
          checked={props.checked}
        />
      </Col>
    </Form.Group>
  );
}
