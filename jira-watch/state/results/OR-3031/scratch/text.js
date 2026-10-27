const fs = require("fs");
const body = JSON.parse(fs.readFileSync(process.argv[2]));
const seen = new Set();
const walk = (o) => { if (o && typeof o === "object") { if (o.ruleIdentifier === "w-last-local-anesthetic-max-dose" && o.routeBasedPromptText) { const t = JSON.stringify(o.routeBasedPromptText); if (!seen.has(t)) { seen.add(t); console.log("routeBasedPromptText:", t); } } if (o.ruleId === "w-last-local-anesthetic-max-dose" && typeof o.body === "string") { if (!seen.has(o.body)) { seen.add(o.body); console.log("banner body:", o.body); } } Object.values(o).forEach(walk); } };
walk(body);
