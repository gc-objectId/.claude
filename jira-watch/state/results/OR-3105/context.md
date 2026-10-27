# OR-3105 — Cache medication audio for 30 days behind a per-release URL

Status: Testing   Assignee: Ryan Ducharme

## Description

Every medication audio prompt is downloaded again on each play. Audio files under /audio are not content-hashed, and jib stamps every file in the image with a 1970 modification time. A plain cache lifetime is therefore not safe: revalidation by Last-Modified would answer 304 forever, and a changed audio file would never reach the browser.

h3. Scope

* Append ?v=<VITE_GIT_SHA> to every medication audio URL in playAlertAudio.ts, so each release has its own URL.
* Serve /audio/** with Cache-Control: max-age=2592000, immutable.
* MockMvc test for the versioned audio URL and its Cache-Control header.

Stacked on PR #4661 (compressed SPA bundle and immutable /static assets). PR: [https://github.com/guidedclinical/orci/pull/4662|https://github.com/guidedclinical/orci/pull/4662]

h3. Acceptance criteria

* On dev, a second play of the same medication audio comes from the browser cache with no network request.
* After a deploy, the audio URL has the new release SHA and the browser downloads the file again.

## Comments (0)

(none)
