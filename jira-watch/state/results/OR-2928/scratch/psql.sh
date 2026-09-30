#!/bin/zsh
docker exec -i orci-loop-or-2928-postgres-1 psql -U orci -d orci -tA "$@"
