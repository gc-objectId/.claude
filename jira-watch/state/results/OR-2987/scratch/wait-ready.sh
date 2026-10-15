#!/bin/sh
for i in $(seq 1 120); do
  out=$(node -e 'const http=require("http");http.get("http://127.0.0.1:58952/actuator/health/readiness",r=>{let d="";r.on("data",c=>d+=c);r.on("end",()=>console.log(r.statusCode,d))}).on("error",e=>console.log("ERR",e.code))' 2>/dev/null)
  case "$out" in 200*) echo "ready after ${i}x5s: $out"; exit 0;; esac
  sleep 5
done
echo "NOT READY: $out"; exit 1
