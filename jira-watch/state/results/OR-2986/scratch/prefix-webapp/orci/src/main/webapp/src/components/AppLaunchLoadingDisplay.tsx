import { Col, ProgressBar, Row, Spinner } from "react-bootstrap";
import { useWebsocketSubscription } from "../context/WebsocketContext";
import { useAppQueryParams } from "../hooks/hooks";
import { useCallback, useMemo, useReducer, useState } from "react";
import { IMessage } from "@stomp/stompjs/src/i-message";

import { logger } from "../utils/logger";
export function AppLaunchLoadingDisplay({
  appLaunchKey,
}: {
  appLaunchKey: string;
}) {
  const { tenantId } = useAppQueryParams();

  const [tasks, updateTask] = useReducer(
    (
      acc: Record<string, "started" | "complete">,
      x: { state: "started" | "complete"; value: string },
    ) => {
      return { ...acc, [x.value]: x.state };
    },
    {},
  );

  const [totalTaskCount, setTotalTaskCount] = useState(0);
  const [remainingTaskCount, setRemainingTaskCount] = useState(0);

  const onMessage = useCallback((m: IMessage) => {
    logger.debug("got websocket message from app-launch channel", m);
    if (m.body.startsWith("register_tasks:")) {
      const t = m.body.split(":")[1].split(";").length;
      setTotalTaskCount(t);
      setRemainingTaskCount(t);
    } else if (m.body.startsWith("progress:")) {
      const [remaining, total] = m.body.split(":")[1].split("/");
      setTotalTaskCount(Number.parseInt(total));
      setRemainingTaskCount(Number.parseInt(remaining));
    } else if (m.body.startsWith("start:")) {
      updateTask({ value: m.body.split(":")[1], state: "started" });
    } else if (m.body.startsWith("end:")) {
      updateTask({ value: m.body.split(":")[1], state: "complete" });
    }
  }, []);

  // Parse appLaunchKey safely to prevent errors if format is unexpected
  const channelName = useMemo(() => {
    try {
      // Expected format: "\"prefix:value\"" -> extract "value"
      const trimmed = appLaunchKey.substring(1, appLaunchKey.length - 1);
      const parts = trimmed.split(":");
      if (parts.length < 2) {
        console.error("Invalid appLaunchKey format:", appLaunchKey);
        return "";
      }
      return `app-launch/${tenantId}/${parts[1]}`;
    } catch (e) {
      console.error("Failed to parse appLaunchKey:", appLaunchKey, e);
      return "";
    }
  }, [appLaunchKey, tenantId]);

  // Subscribe to WebSocket channel (empty channel name won't match any topics)
  useWebsocketSubscription(channelName, onMessage);

  return (
    <Row>
      <Col className="text-center">
        <h1>Application launching...</h1>
        {totalTaskCount > 0 ? (
          <div className="w-50 d-inline-block">
            <ProgressBar
              style={{ height: "10px" }}
              now={totalTaskCount - remainingTaskCount}
              max={totalTaskCount}
              animated={true}
              striped={true}
            />
            <div>
              {totalTaskCount - remainingTaskCount} / {totalTaskCount} tasks
              complete
            </div>

            {Object.entries(tasks)
              .filter((it) => it[1] === "started")
              .map((it) => (
                <div key={it[0]}>{it[0]}</div>
              ))}
          </div>
        ) : (
          <div>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <h4>Preparing...</h4>
          </div>
        )}
      </Col>
    </Row>
  );
}
