S=$(dirname "${BASH_SOURCE[0]}"); A="node $S/api.js"; PG="docker exec orci-loop-or-2822-postgres-1 psql -U orci -d orci -At"
sed "s/^/export /" $S/ids.txt > $S/ids.sh; source $S/ids.sh
j() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const lines=d.trim().split("\n");const o=JSON.parse(lines.slice(1).join("\n"));console.log(eval("o"+process.argv[1]))})' "$1"; }
ops_api() { $A GET "/api/admin/patients/by-pmrn/$PMRN/operations" | j '.map(o=>o.caseId+":"+o.acuity).sort().join("  ")'; }
ops_db() { $PG -c "select string_agg(case_id||':acuity='||coalesce(acuity,'<null>')||'/classification='||coalesce(classification,'<null>'), '  ' order by case_id) from \"demo-demo\".operations where patient_id='$UUID'"; }
wait_up() { for i in $(seq 1 90); do r=$(node $S/api.js login 2>/dev/null | head -1 | tr -d "[:space:]"); [ "$r" = "200" ] && { echo "app up after ~$((i*3))s"; return 0; }; sleep 3; done; echo "app did not come up"; return 1; }
