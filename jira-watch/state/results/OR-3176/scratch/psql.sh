#!/bin/bash
docker exec orci-loop-or-3176-postgres-1 psql -U orci -At -c "set search_path to \"mayo-mayo\"; $1"
