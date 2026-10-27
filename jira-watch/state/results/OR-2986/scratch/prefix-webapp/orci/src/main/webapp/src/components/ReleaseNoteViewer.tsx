import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { sanitizedHtml } from "../utils/markup";
import { Bell } from "react-bootstrap-icons";
import { useAuth } from "../context/AuthContext";
import { isLoggedIn } from "../types/User";
import { marked } from "marked";

type ReleaseNote = {
  text: string;
  version: string;
  isNew: boolean;
};

async function fetchCurrentReleaseNote(): Promise<ReleaseNote | null> {
  const response = await axios.get("/api/release-notes/current");
  return response.data;
}

async function updateViewTime() {
  await axios.post("/api/release-notes/update-view-time");
}

export function ReleaseNoteViewer() {
  const auth = useAuth();
  const releaseNote = useQuery({
    queryKey: ["release-note"],
    queryFn: () => fetchCurrentReleaseNote(),
    enabled: isLoggedIn(auth.user),
  });

  const [showModal, setShowModal] = useState(false);
  const [viewed, setViewed] = useState(false);

  const shouldShowLink = !releaseNote.isLoading && !!releaseNote.data;

  return (
    <>
      {releaseNote.data && (
        <Modal
          aria-label="release-notes-modal"
          show={showModal}
          onHide={() => setShowModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Release Notes</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <h3 className="fa-lg mb-4 mt-2">
              Version {releaseNote.data.version}
            </h3>
            <div
              className="markdown-content-container"
              dangerouslySetInnerHTML={
                (releaseNote?.data?.text &&
                  sanitizedHtml(
                    marked.parse(releaseNote.data.text, { async: false }),
                  )) ||
                undefined
              }
            ></div>
          </Modal.Body>
        </Modal>
      )}
      <Button
        variant="link"
        className="p-0"
        title={releaseNote.data?.version}
        style={{ display: shouldShowLink ? undefined : "none" }}
        onClick={() => {
          updateViewTime();
          setViewed(true);
          setShowModal(true);
        }}
      >
        <span className="small">Release {releaseNote.data?.version}</span>
        {releaseNote.data?.isNew && !viewed && (
          <span className="ms-1">
            <Bell className="shake-on-hover" />
          </span>
        )}
      </Button>
    </>
  );
}
