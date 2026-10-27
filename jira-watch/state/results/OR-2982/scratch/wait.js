const http = require("http");
const start = Date.now();
(function poll() {
  const req = http.get("http://127.0.0.1:63939/actuator/health/readiness", res => {
    let d = ""; res.on("data", c => d += c);
    res.on("end", () => { if (res.statusCode === 200 && /UP/.test(d)) { console.log("ready after", Math.round((Date.now() - start) / 1000), "s", d); } else if (Date.now() - start > 300000) { console.log("TIMEOUT", res.statusCode, d); } else setTimeout(poll, 3000); });
  });
  req.on("error", () => { if (Date.now() - start > 300000) console.log("TIMEOUT err"); else setTimeout(poll, 3000); });
})();
