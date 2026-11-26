#!/bin/bash
docker exec orci-loop-or-3176-redis-1 valkey-cli -a 'g76!s4z' --no-auth-warning del "patients/mayo-mayo/$1" >/dev/null; echo "evicted $1"
