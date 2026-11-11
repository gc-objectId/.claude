const http = require("http");
const start = Date.now();
const tick = () => {
  const req = http.get("http://127.0.0.1:61621/actuator/health/readiness", res => {
    let d = ""; res.on("data", c => d += c); res.on("end", () => {
      if (res.statusCode === 200 && d.includes("UP")) { console.log("READY after", Math.round((Date.now() - start) / 1000), "s", d); process.exit(0); }
      setTimeout(tick, 3000);
    });
  });
  req.on("error", () => setTimeout(tick, 3000));
  req.setTimeout(3000, () => { req.destroy(); });
  if (Date.now() - start > 300000) { console.log("TIMEOUT"); process.exit(1); }
};
tick();
