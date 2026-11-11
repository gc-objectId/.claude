#!/bin/sh
# usage: q.sh <schema> "<sql>"
docker exec orci-loop-or-2786-postgres-1 psql -U orci -d orci -At -c "set search_path to \"$1\", public" -c "$2"
