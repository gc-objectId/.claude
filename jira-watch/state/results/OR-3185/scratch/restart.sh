#!/bin/bash
C=orci-loop-or-3185-orci-1
docker restart $C >/dev/null
for i in $(seq 1 120); do
  s=$(node -e 'require("http").get("http://127.0.0.1:50744/actuator/health/readiness",r=>{let d="";r.on("data",c=>d+=c);r.on("end",()=>console.log(r.statusCode,d))}).on("error",()=>console.log("down"))' 2>/dev/null)
  case "$s" in 200*) echo "ready after ${i}x3s: $s"; exit 0;; esac
  docker inspect -f '{{.State.Running}}' $C | grep -q true || { echo "container exited"; docker logs --tail 60 $C; exit 1; }
  sleep 3
done
echo "timeout"; docker logs --tail 60 $C; exit 1
