#!/bin/bash
# usage: extract.sh <commit>
commit=$1
files=$(git -C "$WT" show --name-only --pretty=format: 2b76db076 | grep 'engine/rule/.*Rule.java')
for f in $files; do
  src=$(git -C "$WT" show "$commit:$f" 2>/dev/null) || continue
  id=$(printf '%s' "$src" | grep -oE 'public static final String ID = "[^"]+"' | head -1 | sed 's/.*"\(.*\)"/\1/')
  ann=$(printf '%s' "$src" | tr '\n' ' ' | grep -oE '@RuleDefinition\(.*?\)' | head -1)
  cat=$(printf '%s' "$src" | grep -oE 'guidanceCategory = GuidanceCategory\.[A-Z_]+' | head -1 | sed 's/.*\.//')
  [ -z "$cat" ] && cat=UNCATEGORIZED
  echo "$id|$cat"
done | sort
