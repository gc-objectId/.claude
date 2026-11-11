#!/bin/zsh
docker exec -i orci-loop-or-2938-postgres-1 psql -U orci -d orci -Atc "$1"
