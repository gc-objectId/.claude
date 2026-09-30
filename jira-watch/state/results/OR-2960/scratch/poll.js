const { login, getConfig } = require("./client");
const { execSync } = require("child_process");
const [rule, key, newValue, totalSecs, label] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => new Date().toISOString();
(async () => {
  await login();
  const first = JSON.parse((await getConfig(rule)).body)[key];
  console.log(`${now()} [${label}] initial via app: ${key}=${first}`);
  for (let i = 0; i < 6; i++) { await getConfig(rule); await sleep(500); }
  const sql = `update "demo-demo".rule_configurations set configuration = (configuration::jsonb || '{"${key}":"${newValue}"}'::jsonb)::json, last_modified_date = now() where rule_identifier='${rule}'`;
  execSync(`docker exec -i orci-loop-or-2960-postgres-1 psql -U orci -d orci -At`, { input: sql });
  const dbRow = execSync(`docker exec orci-loop-or-2960-postgres-1 psql -U orci -d orci -Atc "select configuration::text from \\"demo-demo\\".rule_configurations where rule_identifier='${rule}'"`).toString().trim();
  const t0 = Date.now();
  console.log(`${now()} [${label}] DB updated directly (simulating the other node's write): ${dbRow}`);
  let last = first, reads = 0, flippedAt = null;
  while (Date.now() - t0 < totalSecs * 1000) {
    const v = JSON.parse((await getConfig(rule)).body)[key]; reads++;
    if (v !== last) { console.log(`${now()} [${label}] app value changed ${last} -> ${v} at +${((Date.now() - t0) / 1000).toFixed(1)}s after DB update (${reads} reads so far)`); last = v; if (v === newValue && flippedAt === null) flippedAt = (Date.now() - t0) / 1000; }
    await sleep(500);
  }
  console.log(`${now()} [${label}] SUMMARY: ${reads} reads over ${totalSecs}s at ~2/s (entry never idle >1s); ` + (flippedAt === null ? `app STILL returns ${last}, never picked up DB value ${newValue}` : `app picked up DB value ${newValue} after ${flippedAt.toFixed(1)}s`));
})().catch(e => { console.error("ERR", e); process.exit(1); });
