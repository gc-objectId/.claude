#!/bin/bash
commit=$1
git -C "$WT" grep -l "@RuleDefinition(" "$commit" -- '*/engine/rule/*.java' | sed "s|^${commit}:||" | while read -r f; do
  src=$(git -C "$WT" show "$commit:$f")
  printf '%s' "$src" | grep -q "^@RuleDefinition(" || continue
  id=$(printf '%s' "$src" | grep -oE 'public static final String ID = "[^"]+"' | head -1 | sed 's/.*"\(.*\)"/\1/')
  [ -z "$id" ] && continue
  cat=$(printf '%s' "$src" | grep -oE 'guidanceCategory = GuidanceCategory\.[A-Z_]+' | head -1 | sed 's/.*\.//')
  [ -z "$cat" ] && cat=UNCATEGORIZED
  echo "$id|$cat"
done | sort -u
