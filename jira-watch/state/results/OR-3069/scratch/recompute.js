const A = require("./api.js");
(async () => {
  await A.login();
  const tenant = process.argv[2]; const ids = process.argv.slice(3);
  for (const id of ids) {
    const r = await A.req("POST", `/api/firings/${id}/seen`, { tenant });
    console.log(`seen ${tenant} ${id} -> ${r.status} ${r.status !== 200 ? r.text.slice(0, 200) : ""}`);
  }
})().catch(e => { console.error("ERR", e); process.exit(1); });
