#!/bin/sh
docker exec orci-loop-or-2948-redis-1 sh -c "valkey-cli -a 'g76!s4z' --no-auth-warning --scan --pattern '*$1*' | xargs -r -n1 valkey-cli -a 'g76!s4z' --no-auth-warning del" 
