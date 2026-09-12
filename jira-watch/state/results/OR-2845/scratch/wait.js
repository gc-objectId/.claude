const http = require("http");
const start = Date.now();
function probe() {
  const req = http.get("http://localhost:62095/actuator/health/readiness", (res) => {
    let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => {
      if (res.statusCode === 200 && /UP/.test(d)) { console.log("READY after", Math.round((Date.now() - start) / 1000), "s"); process.exit(0); }
      retry();
    });
  });
  req.on("error", retry);
  req.setTimeout(3000, () => { req.destroy(); });
}
function retry() { if (Date.now() - start > 300000) { console.log("TIMEOUT"); process.exit(1); } setTimeout(probe, 3000); }
probe();
