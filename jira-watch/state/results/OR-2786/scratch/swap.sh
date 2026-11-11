#!/bin/sh
# usage: swap.sh prefix|restore
set -e
C=orci-loop-or-2786-orci-1
D=/Users/ryanducharme/.claude/jira-watch/state/results/OR-2786/scratch/prefix
MGH=/app/classes/com/guided/orci/service/mgh
MAYO=/app/classes/com/guided/orci/integration/mayo
case "$1" in
  prefix)
    mkdir -p $D/backup
    docker cp $C:$MGH/MGHOperationEventService.class $D/backup/
    docker cp $C:$MGH/MGHOperationEventService\$MghEventType.class $D/backup/
    docker cp $D/out/com/guided/orci/service/mgh/MGHOperationEventService.class $C:$MGH/
    docker cp "$D/out/com/guided/orci/service/mgh/MGHOperationEventService\$MghEventType.class" $C:$MGH/
    docker exec $C mkdir -p $MAYO
    docker cp $D/out/com/guided/orci/integration/mayo/MayoOperationEventService.class $C:$MAYO/
    docker cp "$D/out/com/guided/orci/integration/mayo/MayoOperationEventService\$MayoEventType.class" $C:$MAYO/
    ;;
  restore)
    docker cp $D/backup/MGHOperationEventService.class $C:$MGH/
    docker cp "$D/backup/MGHOperationEventService\$MghEventType.class" $C:$MGH/
    docker exec $C rm -rf /app/classes/com/guided/orci/integration/mayo
    ;;
esac
echo "--- state"; docker exec $C sh -c "md5sum $MGH/MGHOperationEventService.class; ls /app/classes/com/guided/orci/integration/ 2>/dev/null || echo 'no mayo shadow dir'"
md5sum $D/backup/MGHOperationEventService.class $D/out/com/guided/orci/service/mgh/MGHOperationEventService.class 2>/dev/null
