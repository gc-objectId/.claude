const { login, req } = require("./client");
const T = { "X-Tenant-Id": "demo-demo" };
const [pu, ou] = process.argv.slice(2);
(async () => {
  const { jar } = await login("admin", "admin");
  const r = await req(jar, "GET", `/api/admin/patients/${pu}/operations/${ou}/context`, { headers: T });
  console.log("STATUS", r.status);
  console.log(r.body.slice(0, 1500));
})();
