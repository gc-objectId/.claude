const { req, login } = require("./api");
const min = m => new Date(Date.now() - m * 60000).toISOString();
const [cmd, ...a] = process.argv.slice(2);
(async () => {
  await login();
  if (cmd === "stage") {
    // stage <tenant> <opStartMinAgo>
    const [tenant, opStart] = a;
    const p = await req("POST", "/api/admin/patients/", { tenant, body: { prmnPrefix: "val", weight: "80 kg", height: "175 cm" } });
    const op = await req("POST", `/api/admin/patients/${p.body.uuid}/operations/create`, { tenant, body: { startTime: min(+opStart), procedureTypes: [{ id: "p-appendectomy", qualifier: null }] } });
    console.log(JSON.stringify({ pmrn: p.body.pmrn, uuid: p.body.uuid, caseId: op.body.caseId, opStart: min(+opStart), status: [p.status, op.status] }));
  } else if (cmd === "bolus") {
    // bolus <tenant> <pmrn> <caseId> <route> <minAgo> [med]
    const [tenant, pmrn, caseId, route, minAgo, med = "m-insulin-regular"] = a;
    const r = await req("POST", `/api/admin/bolus/patient/${pmrn}/${caseId}`, { tenant, body: { medicationId: med, administrationDate: min(+minAgo), doseAmount: "5", doseUnits: "units", route } });
    console.log("bolus", route, min(+minAgo), r.status, r.raw.slice(0, 200));
  } else if (cmd === "glucose") {
    const [tenant, pmrn, caseId, minAgo] = a;
    const r = await req("POST", `/api/admin/observations/patient/${pmrn}/case/${caseId}`, { tenant, body: { type: "GLUCOSE", value: "140", units: "mg/dL", date: min(+minAgo) } });
    console.log("glucose", min(+minAgo), r.status, r.raw.slice(0, 200));
  } else if (cmd === "jobs") {
    const [tenant, caseId] = a;
    const r = await req("GET", `/api/admin/quartz/jobs?caseId=${caseId}`, { tenant });
    console.log(JSON.stringify(r.body, null, 1));
  } else if (cmd === "trigger") {
    const [tenant, jobName, jobGroup] = a;
    const r = await req("POST", `/api/admin/quartz/trigger?jobName=${encodeURIComponent(jobName)}&jobGroup=${jobGroup}`, { tenant });
    console.log("trigger", r.status);
  } else if (cmd === "fired" || cmd === "notfired") {
    const [tenant, caseId, rule = "a-insulin-glucose-check"] = a;
    const r = await req("GET", `/api/admin/rule/evaluations/${cmd === "fired" ? "fired" : "not-fired"}?caseId=${caseId}&ruleIdentifier=${rule}&limit=5`, { tenant });
    console.log(r.status, JSON.stringify(r.body, null, 1));
  } else if (cmd === "launch") {
    const [tenant, pmrn, caseId] = a;
    const r = await req("POST", `/api/cds/app-launch/${pmrn}/${caseId}`, { tenant, body: { timeZone: "America/Chicago" } });
    const alerts = (r.body && r.body.alerts) || [];
    console.log("launch", r.status, JSON.stringify(alerts.map(x => ({ rule: x.ruleIdentifier || x.ruleId, title: x.title, description: x.description, prompt: x.prompt && x.prompt.description })), null, 1), r.status !== 200 ? r.raw.slice(0, 400) : "");
  } else if (cmd === "config") {
    const [tenant, json] = a;
    const r = await req("POST", `/api/admin/rule/configuration/a-insulin-glucose-check`, { tenant, body: JSON.parse(json) });
    console.log("config", r.status, r.raw.slice(0, 300));
  }
})().catch(e => { console.error("ERR", e); process.exit(1); });
