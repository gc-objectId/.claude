import smtpd, asyncore, sys, os, email, time
OUT = sys.argv[1]; PORT = int(sys.argv[2])
os.makedirs(OUT, exist_ok=True)
def log(m):
    print(time.strftime("%H:%M:%S"), m, flush=True)
class Channel(smtpd.SMTPChannel):
    def smtp_MAIL(self, arg):
        if arg:
            address, _ = self._getaddr(self._strip_command_keyword('FROM:', arg))
            if address and not address.lower().endswith('@mgb.org'):
                log("REJECT MAIL FROM %s" % address)
                self.push('550 5.7.1 Sender not authorized for MGB relay: ' + address)
                return
        super().smtp_MAIL(arg)
class Sink(smtpd.SMTPServer):
    channel_class = Channel
    n = 0
    def process_message(self, peer, mailfrom, rcpttos, data, **kw):
        Sink.n += 1
        path = os.path.join(OUT, "msg-%03d.eml" % Sink.n)
        with open(path, "wb") as f: f.write(data)
        m = email.message_from_bytes(data)
        log("ACCEPT #%d envelope-from=%s rcpt=%s | From=%s | Reply-To=%s | To=%s | Subject=%s" %
            (Sink.n, mailfrom, rcpttos, m["From"], m["Reply-To"], m["To"], m["Subject"]))
Sink(("0.0.0.0", PORT), None)
log("sink listening on %d" % PORT)
asyncore.loop()
