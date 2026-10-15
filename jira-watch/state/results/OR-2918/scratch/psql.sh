#!/bin/zsh
docker exec -i orci-loop-or-2918-postgres-1 psql -U orci -d orci -At -c "$1"
