#!/bin/bash
# usage: pg.sh <schema> "<sql>"
docker exec -i orci-loop-or-2921-postgres-1 psql -U orci -d orci -At -c "set search_path to \"$1\"; $2"
