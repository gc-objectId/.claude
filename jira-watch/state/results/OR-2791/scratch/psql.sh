#!/bin/sh
exec docker exec -i orci-loop-or-2791-postgres-1 psql -U "${PGUSER_:-orci}" -d "${PGDB_:-orci}" -At -v ON_ERROR_STOP=1 "$@"
