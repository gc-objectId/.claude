const { makeClient } = require("./client");
const fs = require("fs");
(async () => {
  const c = makeClient("demo-demo");
  await c.login("admin", "admin");
  const file = process.argv[2];
  const boundary = "----or2987" + Date.now();
  const content = fs.readFileSync(file);
  const raw = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="ndc-patterns.csv"\r\nContent-Type: text/csv\r\n\r\n`),
    content, Buffer.from(`\r\n--${boundary}--\r\n`)]);
  const r = await c.request("POST", "/api/admin/config-imports/ndc-patterns/upload", { raw, headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` } });
  console.log("upload", file.split("/").pop(), "->", r.status, r.body.slice(0, 400));
})();
