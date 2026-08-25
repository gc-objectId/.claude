const { req, login } = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
const pmrn = process.argv[2];
(async () => {
  await login("admin", "admin");
  const c = await req("POST", `/api/admin/patients/${pmrn}/conditions`, { conditionId: "c-type-2-diabetes-mellitus", tags: ["DIABETES"] }, T);
  console.log("addCondition", c.status, c.body.slice(0, 200));
  const g = await req("GET", `/api/admin/patients/${pmrn}/conditions`, null, T);
  console.log("conditions", g.status, g.body.slice(0, 400));
})();
