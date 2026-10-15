const c = require("./client.js");
const T = { "X-Tenant-Id": "demo-demo" };
(async () => {
  await c.login();
  const p = await c.request("POST", "/api/admin/patients/", { headers: T, body: { prmnPrefix: "or2949" } });
  const { pmrn, uuid } = JSON.parse(p.body);
  const start = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const o = await c.request("POST", `/api/admin/patients/${uuid}/operations/create`, { headers: T, body: { startTime: start, procedureTypes: [{ id: "p-colorectal", qualifier: null }] } });
  const op = JSON.parse(o.body);
  const caseId = op.caseId;
  const l = await c.request("POST", "/api/app-launch", { headers: T, body: { patientId: pmrn, caseId } });
  const cand = await c.request("GET", `/api/admin/patients/${pmrn}/operations/${caseId}/antibiotic-candidates`, { headers: T });
  const cj = JSON.parse(cand.body);
  console.log(JSON.stringify({ pmrn, uuid, caseId, operationId: op.id, launch: l.status, outcome: cj.outcome, recommended: (cj.recommended || []).map(r => r.candidateDisplayLabels || r) }));
})().catch(e => { console.error("ERR", e); process.exit(1); });
