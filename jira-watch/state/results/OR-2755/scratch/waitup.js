const http = require("http");
const deadline = Date.now() + 180000;
function ping() {
  const req = http.get("http://127.0.0.1:61325/login", r => { r.resume(); if (r.statusCode === 200) { console.log("UP"); process.exit(0); } else retry(); });
  req.on("error", retry);
}
function retry() { if (Date.now() > deadline) { console.log("TIMEOUT"); process.exit(1); } setTimeout(ping, 3000); }
ping();
