import axios from "axios";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Modal } from "react-bootstrap";
import { sanitizedHtml } from "../utils/markup";
import { useAuth } from "../context/AuthContext";
import { isLoggedIn } from "../types/User";
import { marked } from "marked";
import { TenantID } from "../types/identifiers";
import { useAppQueryParams } from "../hooks/hooks";
import { pluralize } from "../utils/stringUtils";

export type FeatureFlagNoteDTO = {
  id: string;
  noteText: string;
  bannerText: string;
  featureName: string;
  hasViewed: boolean;
  lastViewDate: string;
};

async function fetchCurrentFeatureFlagNotes(
  tenantId: TenantID,
): Promise<FeatureFlagNoteDTO[]> {
  const featureFlagResponse = await axios.get("/api/feature-flags/notes", {
    headers: {
      "X-Tenant-Id": tenantId,
    },
  });
  return featureFlagResponse.data as FeatureFlagNoteDTO[];
}

async function updateViewTime(tenantId: TenantID, viewedNoteIds: string[]) {
  await axios.post("/api/feature-flags/notes/update-view-time", viewedNoteIds, {
    headers: {
      "X-Tenant-Id": tenantId,
    },
  });
}

export function FeatureFlagNoteViewer() {
  const auth = useAuth();
  const { tenantId } = useAppQueryParams();
  const featureFlagNoteQ = useQuery({
    queryKey: ["feature-flag-notes"],
    queryFn: () => fetchCurrentFeatureFlagNotes(tenantId),
    enabled: isLoggedIn(auth.user),
    placeholderData: keepPreviousData,
  });

  const [showModal, setShowModal] = useState(false);
  const [viewed, setViewed] = useState(false);
  const unviewedNotes = useMemo(
    () =>
      featureFlagNoteQ.isSuccess
        ? featureFlagNoteQ.data.filter((note) => !note.hasViewed)
        : [],
    [featureFlagNoteQ.data, featureFlagNoteQ.isSuccess],
  );

  useEffect(() => {
    if (featureFlagNoteQ.isSuccess) {
      if (unviewedNotes.length == 0) {
        setShowModal(false);
      } else {
        updateViewTime(
          tenantId,
          unviewedNotes.map((it) => it.id),
        );
      }
    }
  }, [featureFlagNoteQ.isSuccess, tenantId, unviewedNotes]);

  const shouldShowBanner =
    !viewed &&
    !featureFlagNoteQ.isLoading &&
    !!featureFlagNoteQ.data &&
    unviewedNotes.length > 0;

  if (!unviewedNotes) {
    return <></>;
  }
  return (
    <>
      <Modal
        aria-label="feature-notes-modal"
        show={showModal}
        onHide={() => setShowModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>New Feature Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div
            className="markdown-content-container"
            dangerouslySetInnerHTML={sanitizedHtml(
              unviewedNotes
                .map((note) => marked.parse(note.noteText, { async: false }))
                .join("<hr/>"),
            )}
          ></div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowModal(false)}>
            Got it
          </Button>
        </Modal.Footer>
      </Modal>

      <Alert
        variant="warning"
        style={{
          display: shouldShowBanner ? undefined : "none",
          paddingRight: "30px",
        }}
        dismissible
        onClose={() => {}}
      >
        <span
          className="pointer"
          onClick={() => {
            setViewed(true);
            setShowModal(true);
          }}
        >
          <b>New {pluralize(unviewedNotes.length, "Feature")} Available</b>
          {unviewedNotes.length === 1 && (
            <>
              : <span>{unviewedNotes[0].bannerText}</span>
            </>
          )}
          <span className="link-primary ms-2">Learn More</span>
        </span>
      </Alert>
    </>
  );
}
