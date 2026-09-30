#!/bin/sh
exec docker exec -i orci-loop-or-2931-postgres-1 psql -U orci -d orci -At -c "$1"
