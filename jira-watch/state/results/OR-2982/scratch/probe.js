const { request, login } = require("./http.js");
(async () => {
  console.log("admin login", await login("admin", "admin", "admin"));
  const h = { "X-Tenant-Id": "demo-demo" };
  const r = await request("admin", "GET", "/api/admin/patients?size=2", { headers: h });
  console.log("patients", r.status, JSON.stringify(r.body).slice(0, 400));
  console.log("user login", await login("user", "loopuser", "LoopValidate1!"));
  const me = await request("user", "GET", "/api/user/me", { headers: h });
  console.log("me", me.status, JSON.stringify(me.body).slice(0, 300));
})().catch(e => console.error("ERR", e));
