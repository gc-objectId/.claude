---
name: reference-websocket-origin-handshake-validation
description: "How to drive authenticated raw websocket handshakes against the local app to validate the /websocket Origin allow-list, including the flip that reproduces the open behavior"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 4f70125b-00ec-46fa-b71b-05cc779cbd38
  modified: 2026-08-14T18:58:29.581Z
---

Validating the `/websocket` Origin allow-list (`WebSocketConfiguration.allowedOriginPatterns`) end-to-end against a local build:

- Local and docker profiles **do not** set `application.hostname`, so the socket is open by design — pass `-Dapplication.hostname=https://guidedor.guidedclinical.com` in `-Dspring-boot.run.jvmArguments` to get a deployed-like restricted run. Startup prints `registered stomp end points: ... for origins: [...]`, which is the fastest confirmation of what the endpoints actually got.
- The **flip-and-revert is a property, not a code edit**: restart without `application.hostname` and every denial returns 101 again (patterns collapse to `[*]`, which is exactly the pre-fix behavior). Nothing in the tree changes.
- `/websocket` is an exact-path filter chain requiring `hasRole(USER)`, and `RoleHierarchyImpl` maps `ROLE_ADMIN > ROLE_USER`, so the local `admin`/`admin` form login is enough. Without a session you get a security 403 that looks identical to an origin refusal — always prove the allow case upgrades before trusting a denial.
- Drive the handshake with node's `http.request` (see [[reference_curl_blocked_use_node_http]]): headers `Connection: Upgrade`, `Upgrade: websocket`, `Sec-WebSocket-Version: 13`, a random base64 `Sec-WebSocket-Key`, plus `Origin`. Listen for `'upgrade'` (101 = allowed) vs `'response'` (403 = refused). GET needs no CSRF token; the login POST does (see [[reference_local_hl7_inject_auth]]).
- Same-origin and missing-`Origin` requests bypass the list entirely — `OriginHandshakeInterceptor` checks `WebUtils.isSameOrigin` first — so a cross-origin allow case (the configured host itself, from a localhost-served app) is the only one that proves the list permits anything.

Unit-testing the registration wiring needs no Spring context: `new WebMvcStompEndpointRegistry(new SubProtocolWebSocketHandler(channel, channel), new WebSocketTransportRegistration(), new SimpleAsyncTaskScheduler())` — a mocked `WebSocketHandler` is rejected, it unwraps a real `SubProtocolWebSocketHandler`. Then `getHandlerMapping()` → `SimpleUrlHandlerMapping.getUrlMap()` yields `SockJsHttpRequestHandler` at `/websocket/**` and `WebSocketHttpRequestHandler` at `/websocket`; read patterns off `AbstractSockJsService.getAllowedOriginPatterns()` and `OriginHandshakeInterceptor.getAllowedOriginPatterns()`. All public API.
