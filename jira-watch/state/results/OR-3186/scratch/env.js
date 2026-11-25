const { req, login } = require("./client");
(async () => {
  console.log("admin login", (await login("admin", "admin")).status);
  for (const p of ["internal-notifications.subject-prefix", "internal-notifications.notification-addresses[0]", "spring.mail.host", "spring.mail.port"]) {
    const r = await req("GET", "/actuator/env/" + p);
    let v = "?"; try { v = JSON.stringify(JSON.parse(r.body).property); } catch {}
    console.log(p, r.status, v);
  }
})();
