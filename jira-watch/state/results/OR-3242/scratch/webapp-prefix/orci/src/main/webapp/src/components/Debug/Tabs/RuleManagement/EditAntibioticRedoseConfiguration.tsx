import { ChangeEvent, useState } from "react";
import { Button, Container, Form, Modal } from "react-bootstrap";
import axios from "axios";
import { useAppQueryParams } from "../../../../hooks/hooks";

export type EditAntibioticRedoseConfigurationProps = {
  show: boolean;
  handleClose: (message: string) => void;
};

export function EditAntibioticRedoseConfiguration({
  show,
  handleClose,
}: EditAntibioticRedoseConfigurationProps) {
  const { tenantId } = useAppQueryParams();

  const [file, setFile] = useState<File | null>(null);
  const [saveEnabled, setSaveEnabled] = useState<boolean>(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = () => {
    if (file != null) {
      const formData = new FormData();
      formData.append("file", file);

      axios
        .post(
          `/api/admin/rules/antibiotic-reminder-configuration/upload`,
          formData,
          {
            headers: {
              "X-Tenant-Id": tenantId,
            },
          },
        )
        .then((response) => handleClose("Import successful"))
        .catch((error) => {
          handleClose("");
        });
    }
  };
  return (
    <Modal show={show} onHide={() => handleClose("")} keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Antibiotic Redose Reminder Configuration</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container fluid="md">
          <Form>
            <Form.Group className="mt-3 mb-3">
              <Form.Label className="fw-bold me-3">File: </Form.Label>
              <Form.Control type="file" onChange={handleFileChange} />
            </Form.Group>
          </Form>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="primary"
          onClick={() => uploadFile()}
          disabled={file == null}
        >
          Save
        </Button>
        <Button variant="secondary" onClick={() => handleClose("")}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
