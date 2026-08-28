const http = require('http');
const deadline = Date.now() + 240000;
function ping() {
  http.get({host:'localhost',port:50666,path:'/csrf'}, r => {
    if (r.statusCode === 200) { console.log('UP'); process.exit(0); }
    else retry();
  }).on('error', retry);
}
function retry() { if (Date.now() > deadline) { console.log('TIMEOUT'); process.exit(1); } setTimeout(ping, 3000); }
ping();
