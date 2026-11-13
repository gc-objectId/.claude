#!/bin/sh
# Restore the shipped class files from the in-container backup and verify checksums.
docker exec orci-loop-or-2948-orci-1 sh -c 'cd /app/classes/com/guided/orci/engine/rule/event && rm -f IncompleteAntibioticPathwayRule*.class && cp /tmp/shipped-backup/IncompleteAntibioticPathwayRule*.class . && md5sum IncompleteAntibioticPathwayRule*.class' > /tmp/or2948-restored.md5
diff <(sort /tmp/or2948-restored.md5) <(sort ~/.claude/jira-watch/state/results/OR-2948/scratch/backup/shipped.md5) && echo "RESTORE CHECKSUMS MATCH" || echo "RESTORE CHECKSUM MISMATCH"
