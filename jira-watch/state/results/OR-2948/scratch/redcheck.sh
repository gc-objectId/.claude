#!/bin/sh
# usage: redcheck.sh <tag>   — knee arthroscopy, cefazolin 90 min before start, PROCEDURE_START, print prompt + log marker
cd ~/.claude/jira-watch/state/results/OR-2948/scratch
TAG=$1
OUT=$(node stage.js $TAG p-arthroscopy-knee); PMRN=$(node -pe "JSON.parse(process.argv[1]).pmrn" "$OUT"); CASE=$(node -pe "JSON.parse(process.argv[1]).caseId" "$OUT")
echo "$TAG pmrn=$PMRN case=$CASE"
./meds.sh $PMRN $CASE m-cefazolin 90 | head -1
./evict.sh $TAG >/dev/null
node fire.js $PMRN $CASE | grep -v '^ ' | cut -c1-220
docker exec orci-loop-or-2948-postgres-1 psql -U orci -d orci -Atc "select details::jsonb->>'PATHWAY_STATUS', prompt::jsonb->>'title', prompt::jsonb->>'description' from \"demo-demo\".rule_fired_results where rule_identifier='a-incomplete-antibiotic-pathway' order by created_date desc limit 1"
echo "--- log lines for case $CASE"; docker logs --since 2m orci-loop-or-2948-orci-1 2>&1 | grep -E "Pre-fix rule prompt|Rule evaluated: a-incomplete" | cut -c1-400
