---
name: reference_stomp_websocket_auth_handshake
description: "How to drive an authenticated raw STOMP client at the local app's /websocket endpoint, and the CSRF token trap that silently fails every subscription"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 8108dd08-58b4-41df-b7ab-29638b0eed94
  modified: 2026-08-14T19:29:56.384Z
---

To exercise `SubscriptionInterceptor` end-to-end, drive a raw STOMP client at `ws://localhost:8080/websocket` (no SockJS needed — both endpoints are registered). Node 25's global `WebSocket` accepts a `headers` option, so no `ws` dependency is required; see [[reference_curl_blocked_use_node_http]] for the HTTP/cookie-jar half.

This is the layer *above* [[reference_websocket_origin_handshake_validation]]: that one covers the HTTP upgrade (Origin allow-list, 101 vs 403), this one covers the STOMP frames that ride on it once the socket is open.

Sequence that works:

1. `GET /csrf`, then `POST /api/login/basic` (form body) with the `XSRF-TOKEN` cookie value in the header named by the `/csrf` body's `headerName`.
2. **Re-`GET /csrf` after login** and keep the `token` from the *response body*.
3. Open the socket with the `SESSION` cookie, and put that post-login body token in the STOMP `CONNECT` frame headers.

**The trap:** using the pre-login `XSRF-TOKEN` *cookie* value in `CONNECT` lets the handshake succeed and returns a `CONNECTED` frame, but then every `SUBSCRIBE` — including well-formed, authorized ones — is refused with a generic `Failed to send message to ExecutorSubscribableChannel[clientInboundChannel]` and an empty body. The failure looks exactly like an access-check rejection, so it reads as a real finding when it is a harness bug. Login rotates the session and its CSRF token; the frontend (`WebsocketContext.tsx`) uses the `/csrf` body token for `connectHeaders`, which is the behavior to copy. Same re-GET-after-login rule as [[reference_local_guidance_fanout_validation]].

The ERROR frame never carries a cause, and the app logs to a console with no log file, so don't expect to diagnose these from the server side — discriminate by subscribing to a destination that *should* be accepted (e.g. `guidance/demo-demo/patient-a` as `admin`). If that is refused too, the harness is unauthenticated, not the guard firing.

Local admin is `admin`/`admin` (`admin.password` in `application.yml`, user auto-created by `AdminUserSetupRunner`). Broker prefixes have **no leading slash**: `guidance/`, `admin/`, `app-launch/`.
