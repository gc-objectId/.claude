# OR-3106 — Compress the SPA bundle and cache hashed static assets

Status: Testing   Assignee: Ryan Ducharme

## Description

Every app launch downloads the 2.0 MB script and the 449 KB stylesheet again, uncompressed. Spring Security stamps Cache-Control: no-store on every response, including the content-hashed files under /static, and server compression is off.

h3. Scope

* Enable server.compression for html, css and javascript only.
* Serve /static/** with Cache-Control: max-age=2592000, immutable.
* Keep index.html uncached, so a deploy takes effect on the next launch.
* MockMvc test for the immutable header, the uncached index.html, and the /app-launch forward.
* QA smoke test ENV-005 for the Content-Encoding and Cache-Control of the deployed bundle.

PR: [https://github.com/guidedclinical/orci/pull/4661|https://github.com/guidedclinical/orci/pull/4661]

h3. Acceptance criteria

* On dev, the script and stylesheet are served gzipped with Cache-Control: max-age=2592000, immutable.
* On dev, a second launch loads the script and stylesheet from the browser cache with no network request.
* After a deploy, the next launch loads the new bundle.

## Comments (0)

(none)
