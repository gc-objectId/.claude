const { request, login } = require("./client");
(async () => { await login("admin","admin"); const [pmrn, caseId, med] = process.argv.slice(2);
const r = await request("POST", `/api/cds/medication-selection/${pmrn}/${caseId}`, { tenant: "demo-demo", body: { medicationIdentifier: med, timeZone: "America/New_York", isReselection: false } });
console.log(r.status); const j = r.json; console.log(JSON.stringify(j.results, null, 1).slice(0, 4000)); })();
