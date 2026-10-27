const { req, login } = require("./http");
(async () => {
  const l = await login(); console.log("login", l.status);
  const all = await req("GET", "/actuator/loggers"); console.log("loggers", all.status);
  const names = Object.keys(JSON.parse(all.body).loggers || {}).filter(n => /ttddyy|hibernate\.SQL|dsproxy/i.test(n));
  console.log(names);
  for (const n of names) console.log(n, JSON.parse(all.body).loggers[n]);
})().catch(e => console.log("ERR", e));
