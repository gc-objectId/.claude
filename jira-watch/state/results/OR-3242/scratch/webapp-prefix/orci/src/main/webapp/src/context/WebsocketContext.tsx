import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Client } from "@stomp/stompjs";
import { AuthHook, useAuth } from "./AuthContext";
import { logger } from "../utils/logger";
import { isLoaded, isLoading, Loadable, loading } from "../types/Loadable";
import { IMessage } from "@stomp/stompjs/src/i-message";
import { CaseID, PatientID, TenantID } from "../types/identifiers";

export type WebsocketState = {
  client: Loadable<Client>;
  connectionVersion: number;
};

export const WebsocketContext = createContext<WebsocketState>({
  client: loading(),
  connectionVersion: 0,
});

const HEARTBEAT_INTERVAL_MS = 10_000;
const RECONNECT_DELAY_MS = 5_000;

function useSTOMPClient(auth: AuthHook) {
  const [stompClient, setStompClient] = useState<Loadable<Client>>(loading());
  const [connectionVersion, setConnectionVersion] = useState(0);

  useEffect(() => {
    if (isLoading(auth.csrfToken)) {
      return () => {};
    }

    let loc = window.location;
    let brokerURL;
    if (loc.protocol === "https:") {
      brokerURL = "wss:";
    } else {
      brokerURL = "ws:";
    }
    brokerURL += "//" + loc.host;
    const client = new Client({
      brokerURL: `${brokerURL}/websocket`,
      connectHeaders: {
        [auth.csrfToken.headerName]: auth.csrfToken.token,
      },
      debug: function (str) {
        if (
          str.includes("destination:/app/heartbeat") ||
          str.includes("destination:/app/operation/heartbeat")
        ) {
          return; // don't spam heartbeats to the console
        }
        logger.debug(new Date(), str);
      },
      reconnectDelay: RECONNECT_DELAY_MS,
      onConnect: () => setConnectionVersion((v) => v + 1),
      onDisconnect: () => setConnectionVersion((v) => v + 1),
      onStompError: () => setConnectionVersion((v) => v + 1),
    });

    client.onStompError = function (frame) {
      // Will be invoked in case of error encountered at Broker
      // Bad login/passcode typically will cause an error
      // Complaint brokers will set `message` header with a brief message. Body may contain details.
      // Compliant brokers will terminate the connection after any error
      logger.warn("Broker reported error: ", frame.headers["message"]);
      logger.warn("Additional details: ", frame.body);
    };
    client.activate();
    setStompClient(client);
    return () => {
      client.deactivate();
    };
  }, [auth.csrfToken]);

  return { client: stompClient, connectionVersion };
}

function useHeartbeat(client: Loadable<Client>, heartbeatIntervalMs: number) {
  useEffect(() => {
    const interval = setInterval(() => {
      if (isLoaded(client) && client.connected) {
        client.publish({ destination: "/app/heartbeat" });
      }
    }, heartbeatIntervalMs);
    return () => clearInterval(interval);
  }, [client, heartbeatIntervalMs]);
}

export function WebsocketProvider({ children }: PropsWithChildren<{}>) {
  const auth = useAuth();
  const { client, connectionVersion } = useSTOMPClient(auth);
  useHeartbeat(client, HEARTBEAT_INTERVAL_MS);

  let value: WebsocketState = { client, connectionVersion };
  return (
    <WebsocketContext.Provider value={value}>
      {children}
    </WebsocketContext.Provider>
  );
}

export function useWebsocketSubscription(
  channelName: string,
  onMessage: (m: IMessage) => void,
) {
  const websocketState = useContext(WebsocketContext);

  const { client, connectionVersion } = websocketState;
  const isConnected = isLoaded(client) && client.connected;
  const callbackRef = useRef(onMessage);

  // todo: group multiple subscribers to the same channel together

  useEffect(() => {
    callbackRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    // if no channel name or client, no-op
    if (
      channelName == null ||
      channelName.length == 0 ||
      !isLoaded(client) ||
      !client.connected
    )
      return () => {};

    const sub = client.subscribe(channelName, (message) =>
      callbackRef.current(message),
    );
    return () => sub.unsubscribe();
  }, [channelName, client, isConnected, connectionVersion]);
  // isConnected ensures resubscribe when STOMP flips its connected flag;
  // connectionVersion is bumped on connect/disconnect/error to force a re-run even when
  // client ref stays stable across reconnects (stomp keeps the same client instance).
}

export function useWebsocketOperationHeartbeat(
  tenantId: TenantID,
  patientId: PatientID,
  caseId: CaseID,
) {
  const websocketState = useContext(WebsocketContext);

  const client = websocketState.client;

  useEffect(() => {
    const interval = setInterval(() => {
      if (isLoaded(client) && client.connected) {
        const payload = patientId + ":" + caseId;
        client.publish({
          destination: "/app/operation/heartbeat",
          headers: { "X-Tenant-Id": tenantId },
          body: payload,
        });
      }
    }, 1000 * 60);
    return () => clearInterval(interval);
  }, [client, caseId, patientId, tenantId]);
}
