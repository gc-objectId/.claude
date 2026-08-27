const { request, loadJar } = require('./req');

async function main() {
  const user = process.argv[2] || 'admin';
  const pass = process.argv[3] || 'admin';
  await request('GET', '/csrf');
  const jar = loadJar();
  const xsrf = jar['XSRF-TOKEN'];
  const form = `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
  const r = await request('POST', '/api/login/basic', form, {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-XSRF-TOKEN': xsrf,
  });
  console.log('LOGIN', r.status, r.body.slice(0, 400));
  console.log('JAR', JSON.stringify(loadJar()));
}
main();
