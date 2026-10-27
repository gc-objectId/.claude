#!/bin/sh
# usage: waitboot.sh <since-marker>
for i in $(seq 1 150); do
  if docker logs --since "$1" orci-loop-or-3027-orci-1 2>&1 | grep -q "Started OrciApplication in"; then echo "booted after ~$((i*2))s"; exit 0; fi
  sleep 2
done
echo "BOOT TIMEOUT"; docker logs --since "$1" orci-loop-or-3027-orci-1 2>&1 | grep -E "ERROR|Exception" | head -5; exit 1
