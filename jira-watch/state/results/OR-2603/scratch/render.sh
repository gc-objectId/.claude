#!/bin/bash
# render.sh <sqlfile> <start> <end>  -> stdout, Metabase params substituted as date literals
sed -e "s/{{START_DATE}}/'$2'/g" -e "s/{{END_DATE}}/'$3'/g" "$1"
