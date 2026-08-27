function jhash(s){let h=0;for(let i=0;i<s.length;i++){h=(Math.imul(31,h)+s.charCodeAt(i))|0;}return h;}
function objectsHash(...args){let r=1;for(const a of args){r=(Math.imul(31,r)+jhash(a))|0;}return r;}
const [tenant,pid]=process.argv.slice(2);
console.log(objectsHash('patient-refresh',tenant,pid));
