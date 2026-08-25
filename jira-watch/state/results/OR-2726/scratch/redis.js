const {execFileSync} = require('child_process');
const C = ['exec','-i','orci-loop-or-2726-redis-1','valkey-cli','-a','g76!s4z','--no-auth-warning'];
function cli(args, stdin) {
  return execFileSync('docker', [...C, ...args], {input: stdin, encoding:'utf8', maxBuffer: 1<<26});
}
module.exports = {cli};
