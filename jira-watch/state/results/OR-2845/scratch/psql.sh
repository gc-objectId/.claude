#!/bin/zsh
# usage: psql.sh <schema> "<sql>"
docker exec orci-loop-or-2845-postgres-1 psql -U orci -d orci -At -c "set search_path to \"$1\"; $2"
