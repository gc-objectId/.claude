import "../../App.scss";
import { FormEvent, useState } from "react";
import { Alert, Button, Form, InputGroup, Spinner } from "react-bootstrap";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getEmailSettingsOptions,
  sendTestEmailMutation,
} from "@api/@tanstack/react-query.gen";
import { EmailSettingsDto, EmailTestResultDto } from "@api";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { Fact, FactList } from "../../components/Admin/FactList";

function EmailSettings({ settings }: { settings: EmailSettingsDto }) {
  const server = settings.host
    ? `${settings.host}${settings.port ? `:${settings.port}` : ""}`
    : "Not set";
  const notificationAddresses = settings.notificationAddresses ?? [];
  return (
    <section className="admin-section">
      <FactList>
        <Fact label="Status" invalid={!settings.configured}>
          {settings.configured ? "Configured" : "Not configured"}
        </Fact>
        <Fact label="SMTP server" wide>
          {server}
        </Fact>
        <Fact label="From" wide>
          {settings.fromAddress}
        </Fact>
        <Fact label="Notification recipients" wide>
          {notificationAddresses.length > 0
            ? notificationAddresses.join(", ")
            : "None"}
        </Fact>
      </FactList>
    </section>
  );
}

function SendResult({
  recipient,
  result,
}: {
  recipient: string;
  result: EmailTestResultDto;
}) {
  if (result.accepted) {
    return (
      <Alert variant="success">
        The mail server accepted the test email for <strong>{recipient}</strong>
        . Check that inbox, including spam, to confirm delivery.
      </Alert>
    );
  }
  return (
    <Alert variant="danger">
      The test email was not sent: {result.error ?? "Unknown error"}
    </Alert>
  );
}

export function EmailTestContent() {
  const [recipient, setRecipient] = useState("");
  const [sentTo, setSentTo] = useState("");
  const {
    data: settings,
    isLoading,
    isError: isSettingsError,
    error: settingsError,
  } = useQuery(getEmailSettingsOptions());
  const send = useMutation(sendTestEmailMutation());

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = recipient.trim();
    setSentTo(trimmed);
    send.mutate({ body: { recipient: trimmed } });
  }

  return (
    <>
      <AdminPageHeader
        title="Email Test"
        meta="Send a test email to confirm this server can send email. It uses the same sender settings as internal notifications."
      />
      <Form onSubmit={handleSubmit} className="admin-toolbar">
        <InputGroup className="admin-toolbar__search">
          <InputGroup.Text>Recipient</InputGroup.Text>
          <Form.Control
            type="email"
            placeholder="name@example.com"
            aria-label="Recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
          />
          <Button
            type="submit"
            disabled={send.isPending || !settings?.configured}
          >
            {send.isPending ? "Sending…" : "Send test email"}
          </Button>
        </InputGroup>
      </Form>
      {send.isError && (
        <Alert variant="danger">
          Failed to send the test email: {send.error.message}
        </Alert>
      )}
      {send.data && <SendResult recipient={sentTo} result={send.data} />}
      {settings && !settings.configured && (
        <Alert variant="warning">
          Email is not configured on this server, so a test email cannot be
          sent.
        </Alert>
      )}
      {isLoading && (
        <div className="admin-empty">
          <Spinner size="sm" aria-hidden="true" />
          Loading email settings…
        </div>
      )}
      {isSettingsError && (
        <Alert variant="danger">
          Failed to load email settings: {settingsError.message}
        </Alert>
      )}
      {settings && <EmailSettings settings={settings} />}
    </>
  );
}

export default function EmailTest() {
  return (
    <AdminPage>
      <EmailTestContent />
    </AdminPage>
  );
}
