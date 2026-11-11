const { request, login } = require("./api");
(async () => {
  console.log("login", await login());
  console.log("health", (await request("GET", "/actuator/health/readiness")).status);
  const lg = await request("GET", "/actuator/loggers/com.guided.orci.engine.RuleEngine");
  console.log("loggers", lg.status, JSON.stringify(lg.body));
  const me = await request("GET", "/api/user-info");
  console.log("user-info", me.status, JSON.stringify(me.body).slice(0, 200));
})();
