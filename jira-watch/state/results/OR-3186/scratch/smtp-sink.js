const net = require("net");
const fs = require("fs");
const OUT = process.argv[2];
net.createServer(sock => {
  let data = "", inData = false, msg = "";
  sock.write("220 sink ESMTP\r\n");
  sock.on("data", chunk => {
    data += chunk.toString();
    let idx;
    while ((idx = data.indexOf("\r\n")) >= 0) {
      const line = data.slice(0, idx); data = data.slice(idx + 2);
      if (inData) {
        if (line === ".") {
          inData = false;
          const subject = (msg.match(/^Subject: (.*)$/m) || [])[1];
          const to = (msg.match(/^To: (.*)$/m) || [])[1];
          const from = (msg.match(/^From: (.*)$/m) || [])[1];
          const rec = { at: new Date().toISOString(), subject, to, from };
          fs.appendFileSync(OUT, JSON.stringify(rec) + "\n");
          fs.appendFileSync(OUT + ".raw", msg + "\n=====\n");
          msg = ""; sock.write("250 OK\r\n");
        } else msg += line + "\n";
        continue;
      }
      const cmd = line.split(" ")[0].toUpperCase();
      if (cmd === "EHLO" || cmd === "HELO") sock.write("250-sink\r\n250 OK\r\n");
      else if (cmd === "DATA") { inData = true; sock.write("354 go\r\n"); }
      else if (cmd === "QUIT") { sock.write("221 bye\r\n"); sock.end(); }
      else sock.write("250 OK\r\n");
    }
  });
  sock.on("error", () => {});
}).listen(2525, "0.0.0.0", () => console.log("sink listening 2525"));
