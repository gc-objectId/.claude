const { req, login } = require("./http");
(async () => {
  await login();
  const level = process.argv[2] || "DEBUG";
  for (const n of ["net.ttddyy.dsproxy.listener.logging.SLF4JQueryLoggingListener", "net.ttddyy.dsproxy.listener.SLF4JQueryLoggingListener"]) {
    const r = await req("POST", `/actuator/loggers/${n}`, { body: { configuredLevel: level } });
    const g = await req("GET", `/actuator/loggers/${n}`);
    console.log(n, r.status, g.body);
  }
})().catch(e => console.log("ERR", e));
