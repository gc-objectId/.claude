---
name: bash-heredoc-unicode-escapes
description: A \uXXXX escape typed into a Bash command or heredoc can arrive in the file as the literal invisible character
metadata:
  type: reference
---

Writing Python test source through a Bash heredoc, `" "` and `"﻿"` landed in the file as the
literal NBSP and BOM characters, not as six-character escapes (seen 2026-10-16, OR-2901). The tests still
passed, but the source carried invisible bytes, and later exact-match edits failed on anchors that looked identical.

**How to apply:** when source must contain a `\u` escape, build it in a Python edit script with
`chr(92) + "u" + format(cp, "04x")`, then check with `LC_ALL=C grep -n $'\xc2\xa0\|\xef\xbb\xbf' file`.
`rm -rf` on a variable path is also denied by the permission layer, so make a fresh scratch dir instead.
