#!/bin/sh
docker exec -i orci-loop-or-2978-postgres-1 psql -U orci -d orci -At "$@"
