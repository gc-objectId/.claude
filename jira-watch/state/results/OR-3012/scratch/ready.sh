#!/bin/sh
for i in $(seq 1 90); do
  s=$(node -e 'const http=require("http");http.get("http://127.0.0.1:54907/actuator/health/readiness",r=>{let d="";r.on("data",c=>d+=c);r.on("end",()=>console.log(r.statusCode,d))}).on("error",e=>console.log("ERR",e.code))' 2>/dev/null)
  case "$s" in 200*) echo "ready after ${i}x3s: $s"; exit 0;; esac
  sleep 3
done
echo "NOT READY: $s"; exit 1
