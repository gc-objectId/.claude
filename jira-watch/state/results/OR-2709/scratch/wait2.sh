#!/bin/sh
n=0
while [ $n -lt 60 ]; do
  if docker logs bb0431ee30e7 2>&1 | grep -c "Started OrciApplication" | grep -q "^3$"; then echo "booted"; exit 0; fi
  n=$((n+1))
  /bin/sleep 3 2>/dev/null || :
done
echo "timeout"; exit 1
