const {req,login,cookies} = require('./http.js');
const TENANT = 'mayo-mayo';
const T = {'X-Tenant-Id': TENANT};
async function auth(user, pass) {
  await login(user || 'admin', pass || 'admin');
  await req('GET','/api/admin/patients?limit=1',null,T);
  return Object.assign({'X-XSRF-TOKEN':cookies['XSRF-TOKEN']}, T);
}
module.exports = {req, auth, T, TENANT};
