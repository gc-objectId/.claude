const http = require("http"); const fs = require("fs");
const { req, login, jar } = require("./http");
function upload(key, filePath, tenant = "mayo-mayo") {
  return new Promise((resolve, reject) => {
    const boundary = "----or3010" + Date.now();
    const file = fs.readFileSync(filePath);
    const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="DoseAdjustments.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`);
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([head, file, tail]);
    const h = { Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; "), "X-Tenant-Id": tenant, "X-XSRF-TOKEN": jar["XSRF-TOKEN"], "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": body.length };
    const r = http.request(`http://127.0.0.1:61603/api/admin/config-imports/${key}/upload`, { method: "POST", headers: h }, res => { let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, text: d })); });
    r.on("error", reject); r.write(body); r.end();
  });
}
(async () => { await login(); const r = await upload("dose-adjustments", process.argv[2]); console.log("upload", r.status, r.text.slice(0, 500)); })().catch(e => { console.error(e); process.exit(1); });
