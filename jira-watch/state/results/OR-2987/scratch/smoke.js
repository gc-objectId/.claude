const { makeClient } = require("./client");
(async () => {
  const c = makeClient("demo-demo");
  const l = await c.login("admin", "admin");
  console.log("login", l.status, l.headers.location || "");
  const me = await c.request("GET", "/api/admin/config-imports");
  console.log("config-imports", me.status, me.body.slice(0, 300));
})();
