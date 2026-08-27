#!/bin/sh
docker exec orci-loop-or-2782-postgres-1 psql -U orci -d orci -c "select o.case_id, p.epic_user_id, p.name, p.role, o.last_modified_date from \"mayo-mayo\".operations o left join \"mayo-mayo\".practitioners p on p.id=o.primary_practitioner_id where o.case_id like 'OR2782%' order by o.case_id;"
