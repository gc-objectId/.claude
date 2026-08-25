const http = require("http");
const fs = require("fs");
const LOG = "/Users/ryanducharme/.claude/jira-watch/state/results/OR-2723/scratch/stub-epic.log";
const PERID_SYSTEM = "urn:oid:1.2.840.114350.1.13.451.3.7.5.737384.135";
const PROVID_SYSTEM = "urn:oid:1.2.840.114350.1.13.451.3.7.5.737384.6";

const KNOWN = {
  "PERID-NONAME-001": {
    id: "ePractitionerFhirId001",
    name: "Reyes, Aurelia B, MD",
    provid: "PROVID-9001",
    email: "aurelia.reyes@example.org",
  },
};

function log(m) { fs.appendFileSync(LOG, new Date().toISOString() + " " + m + "\n"); }

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    log(req.method + " " + req.url);
    const u = new URL(req.url, "http://stub");
    if (u.pathname.endsWith("/oauth2/token")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ access_token: "stub-token-abc", token_type: "bearer", expires_in: 3600 }));
    }
    if (u.pathname.endsWith("/Practitioner")) {
      const identifier = u.searchParams.get("identifier") || "";
      const perid = identifier.split("|")[1];
      const p = KNOWN[perid];
      if (!p) {
        res.writeHead(200, { "Content-Type": "application/fhir+json" });
        return res.end(JSON.stringify({ resourceType: "Bundle", type: "searchset", total: 0, entry: [] }));
      }
      res.writeHead(200, { "Content-Type": "application/fhir+json" });
      return res.end(JSON.stringify({
        resourceType: "Bundle", type: "searchset", total: 1,
        entry: [{ resource: {
          resourceType: "Practitioner", id: p.id,
          identifier: [
            { system: PERID_SYSTEM, value: perid },
            { system: PROVID_SYSTEM, value: p.provid },
          ],
          name: [{ family: p.name.split(",")[0], given: [p.name.split(",")[1].trim()], text: p.name }],
          telecom: [{ system: "email", value: p.email }],
        }}],
      }));
    }
    if (u.pathname.endsWith("/PractitionerRole")) {
      res.writeHead(200, { "Content-Type": "application/fhir+json" });
      return res.end(JSON.stringify({
        resourceType: "Bundle", type: "searchset", total: 1,
        entry: [{ resource: {
          resourceType: "PractitionerRole", id: "role1",
          code: [{ text: "Anesthesiologist" }],
          specialty: [{ text: "Anesthesiology" }],
        }}],
      }));
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end("{}");
  });
});
server.listen(60777, "0.0.0.0", () => log("stub listening on 60777"));
