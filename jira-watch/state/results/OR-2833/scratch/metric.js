const {req, login} = require('./client');
async function main() {
  await login('admin','admin');
  const m = await req('GET', '/actuator/metrics/orci.case.launch');
  console.log('orci.case.launch ->', m.status, m.body);
}
main();
