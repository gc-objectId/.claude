const { makeClient } = require("./http");
async function check(label, c, headers) {
  const r = await c.mutate("POST", "/api/login/check?userId=", { headers });
  const sess = r.setCookie.filter((s) => s.startsWith("JSESSIONID") || s.startsWith("SESSION"));
  console.log(label, "->", r.status, r.text.slice(0, 200), "| session cookies set:", JSON.stringify(sess.map((s) => s.split(";")[0].split("=")[0])));
}
(async () => {
  const anon = makeClient();
  await check("signed-out, no tenant", anon, {});
  await check("signed-out, tenant demo-demo", anon, { "X-Tenant-Id": "demo-demo" });
  await check("signed-out, tenant bogus-x", anon, { "X-Tenant-Id": "bogus-x" });
  const admin = makeClient();
  await admin.login("admin", "admin");
  await check("signed-in admin, no tenant", admin, {});
  await check("signed-in admin, tenant demo-demo", admin, { "X-Tenant-Id": "demo-demo" });
  const user = makeClient();
  await user.login("loopuser", "LoopValidate1!");
  await check("signed-in loopuser, no tenant", user, {});
})().catch((e) => { console.error("ERR", e); process.exit(1); });
