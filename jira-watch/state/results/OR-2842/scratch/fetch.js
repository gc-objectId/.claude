const http = require('http');
const [,, path, outFile] = process.argv;
http.get({host:'localhost', port:63916, path}, res => {
  let d=''; res.on('data', c=>d+=c); res.on('end', ()=>{
    console.log('STATUS', res.statusCode, 'LEN', d.length, 'LOC', res.headers.location||'');
    if (outFile) require('fs').writeFileSync(outFile, d);
    else console.log(d.slice(0,400));
  });
}).on('error', e=>console.log('ERR', e.message));
