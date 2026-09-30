const { execSync } = require("child_process");
const [pattern, want, timeoutS] = process.argv.slice(2);
const t0 = Date.now();
while (Date.now() - t0 < +timeoutS * 1000) {
  const n = +execSync(`docker logs orci-loop-or-2951-orci-1 2>&1 | grep -c -- '${pattern}' || true`).toString().trim();
  if (n >= +want) { console.log(`ok: ${n} lines match '${pattern}' after ${((Date.now()-t0)/1000).toFixed(1)}s`); process.exit(0); }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
}
console.log("TIMEOUT"); process.exit(1);
