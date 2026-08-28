const fs = require('fs');
const { req, jar, login } = require('./client.js');
async function upload(tenant, key, filePath) {
  const boundary = '----orciBoundary1234567890';
  const fileName = filePath.split('/').pop();
  const content = fs.readFileSync(filePath);
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
    `Content-Type: text/csv\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([head, content, tail]);
  return req('POST', `/api/admin/config-imports/${key}/upload`, {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
      'X-XSRF-TOKEN': jar['XSRF-TOKEN'],
      'X-Tenant-Id': tenant,
    }, body });
}
async function count(tenant, key) {
  const l = await req('GET', '/api/admin/config-imports', { headers: { 'X-Tenant-Id': tenant } });
  return JSON.parse(l.body).find(x => x.key === key).recordCount;
}
module.exports = { upload, count, login, req, jar };
