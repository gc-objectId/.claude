import React, { useCallback, useEffect, useState } from "react";
import { Button, Container, Form, Modal, Spinner } from "react-bootstrap";
import { isLoading, Loadable, loading } from "../../../../types/Loadable";
import { RuleController } from "@api";
import { capitalize } from "lodash";

export type EditRuleConfigurationProps = {
  show: boolean;
  ruleIdentifier: string;
  handleClose: (message: string) => void;
};

export function EditRuleConfiguration({
  show,
  ruleIdentifier,
  handleClose,
}: EditRuleConfigurationProps) {
  const [ruleConfiguration, setRuleConfiguration] = useState<
    Loadable<Record<string, string>>
  >(loading());

  const loadRuleConfiguration = useCallback(async () => {
    setRuleConfiguration(loading());
    const { data } = await RuleController.getRuleConfiguration({
      path: { ruleIdentifier },
    });
    setRuleConfiguration(data ?? {});
  }, [ruleIdentifier]);

  useEffect(() => {
    loadRuleConfiguration();
  }, [loadRuleConfiguration]);

  const saveConfiguration = useCallback(async () => {
    const response = await RuleController.updateRuleConfiguration({
      path: { ruleIdentifier },
      body: ruleConfiguration as Record<string, string>,
    });
    if (!response.error) {
      handleClose(`Configuration for ${ruleIdentifier} updated`);
    } else {
      handleClose(
        `Error updating configuration for ${ruleIdentifier}: ${response.error}`,
      );
    }
  }, [ruleConfiguration, ruleIdentifier, handleClose]);

  const closeModal = () => {
    handleClose("");
  };

  const handleTextChange = (attr: string | any, value: string) => {
    setRuleConfiguration((prevState) => {
      // @ts-ignore
      return { ...prevState, [attr]: value };
    });
  };
  if (isLoading(ruleConfiguration)) {
    return <Spinner />;
  }
  return (
    <Modal show={show} onHide={closeModal} keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{ruleIdentifier} Configuration</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container fluid="md">
          <Form>
            {Object.entries(ruleConfiguration).map(([name, value]) => {
              const nameForDisplay = name
                .split("_")
                .map((it) => capitalize(it))
                .join(" ");
              return (
                <Form.Group className="mt-3 mb-3" key={name}>
                  <Form.Label className="fw-bold me-3">
                    {nameForDisplay}:{" "}
                  </Form.Label>
                  <Form.Control
                    type="text"
                    onChange={(e) => handleTextChange(name, e.target.value)}
                    value={value}
                  />
                </Form.Group>
              );
            })}
          </Form>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={() => saveConfiguration()}>
          Save
        </Button>
        <Button variant="secondary" onClick={closeModal}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
