const net = require("net");
const fs = require("fs");
const dir = process.argv[2];
let n = 0;
net.createServer(sock => {
  let buf = "", data = false, from = "", to = [], body = "";
  sock.write("220 sink ESMTP\r\n");
  sock.on("data", chunk => {
    buf += chunk.toString("utf8");
    let i;
    while ((i = buf.indexOf("\r\n")) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (data) {
        if (line === ".") {
          data = false; n++;
          const f = `${dir}/mail-${String(n).padStart(2, "0")}.eml`;
          fs.writeFileSync(f, `X-Sink-From: ${from}\nX-Sink-To: ${to.join(", ")}\n${body}`);
          console.log(`[sink] stored ${f} from=${from} to=${to.join(",")}`);
          body = ""; to = []; sock.write("250 OK queued\r\n");
        } else body += (line.startsWith("..") ? line.slice(1) : line) + "\n";
        continue;
      }
      const u = line.toUpperCase();
      if (u.startsWith("EHLO")) sock.write("250-sink\r\n250 8BITMIME\r\n");
      else if (u.startsWith("HELO")) sock.write("250 sink\r\n");
      else if (u.startsWith("MAIL FROM")) { from = line.slice(10).trim(); sock.write("250 OK\r\n"); }
      else if (u.startsWith("RCPT TO")) { to.push(line.slice(8).trim()); sock.write("250 OK\r\n"); }
      else if (u === "DATA") { data = true; sock.write("354 go\r\n"); }
      else if (u === "QUIT") { sock.write("221 bye\r\n"); sock.end(); }
      else if (u === "RSET" || u === "NOOP") sock.write("250 OK\r\n");
      else sock.write("500 huh\r\n");
    }
  });
  sock.on("error", e => console.log("[sink] socket error", e.code));
}).listen(2525, "::", () => console.log("[sink] listening on [::]:2525"));
