import "./FeedbackWidget.scss";
import React, {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { Alert, Button } from "react-bootstrap";
import { useAppQueryParams } from "../../hooks/hooks";
import { AsyncSpinnerButton } from "../AsyncButton";
import { FeedbackController } from "@api";

export type FeedbackWidgetProps = { show: boolean; onHide: () => void };

export function FeedbackWidget({ show, onHide }: FeedbackWidgetProps) {
  const { patientId, tenantId, caseId } = useAppQueryParams();
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSubmitEnabled = useMemo(() => {
    return (
      comment != null &&
      comment.trim().length > 0 &&
      !isSubmitted &&
      !isSubmitting
    );
  }, [comment, isSubmitted, isSubmitting]);

  const submit = async () => {
    setIsSubmitting(true);
    const response = await FeedbackController.feedback({
      body: {
        patientId,
        caseId,
        comment,
      },
    });
    setIsSubmitting(false);
    if (response.data) {
      setIsSubmitted(true);
    } else if (response.error) {
      console.error("error submitting feedback: ", response.error);
      setIsSubmitted(true);
    }

    // Clear any existing timeout before setting a new one
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current);
    }

    hideTimeoutRef.current = setTimeout(() => {
      resetForm();
      onHide();
      hideTimeoutRef.current = null;
    }, 1200);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current !== null) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, []);

  const updateComment = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setComment("");
  };

  return (
    <Modal show={show} onHide={() => onHide()} keyboard={false} centered>
      <Modal.Header closeButton>
        <Modal.Title>Give Feedback</Modal.Title>
      </Modal.Header>

      <Modal.Body className="">
        <div className="mb-2 small">
          Feedback will be used to improve GuidedOR. It will not be saved in the
          patient’s medical record.
        </div>
        <div>
          <div className="small">Comments</div>
          <Form.Control
            as="textarea"
            className="small"
            style={{ resize: "none", height: "120px" }}
            disabled={isSubmitting || isSubmitted}
            onChange={updateComment}
            value={comment}
          ></Form.Control>
        </div>
      </Modal.Body>

      <Modal.Footer>
        {isSubmitted ? (
          <Alert variant="success" className="small w-100">
            Thank you for your feedback!
          </Alert>
        ) : (
          <div className="d-flex justify-content-evenly w-100">
            <AsyncSpinnerButton
              variant="primary"
              size="sm"
              onClick={submit}
              disabled={!isSubmitEnabled}
            >
              Submit
            </AsyncSpinnerButton>

            <Button
              variant="link"
              size="sm"
              onClick={() => {
                resetForm();
                onHide();
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </Modal.Footer>
    </Modal>
  );
}
