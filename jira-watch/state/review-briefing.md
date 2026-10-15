# Validation loop review — 2026-10-14 11:34

## Stranded worktrees

```
keep   OR-2863      in use — pid 10300 has its cwd in there
stranded OR-2914    /Users/ryanducharme/dev/worktrees/OR-2914-ndc-mapping
keep   OR-2928      2 commits ahead, 0 dirty files — has work in it
keep   OR-2941      in use — pid 21185 has its cwd in there

1 stranded. Re-run with --apply to clear them.
```

## Digest

```
Validation digest — 6 runs since 2026-10-13T15:34:56Z

NEEDS YOU — refused by the gate (1)
  OR-2966  verdict=inconclusive; verdict is 'inconclusive'

NEEDS YOU — no merged PR, nothing to validate (1)
  OR-2946  no merged PR within the search window; needs a human disposition

NEEDS YOU — aborted before validating (1)
  OR-2918  status is 'Done', not a validate-mode status

Closed clean (3)
  OR-2950  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2987  verdict=deploy-ready; posted and transitioned; caveats recorded, none material
  OR-2949  verdict=deploy-ready; posted and transitioned; caveats recorded, none material

Skip-listed, not shown above: OR-2603 OR-2691 OR-2775 OR-2777 OR-2799 OR-2780 OR-2783 OR-2914 OR-2901 OR-2915 

WHAT TO DO NEXT
  3 ticket(s) need a decision from you.
  loopcmd review          walk them one at a time with a session (the usual way)
  loopcmd session OR-123  dig into one, in a worktree on its branch
  unblock.sh OR-123       answer it as a Jira comment; the next sweep reads that
  unblock.sh skip OR-123  stop offering it
  loopcmd cover OR-123    turn its proposed tests into a draft PR
  digest.sh OR-123        everything on one ticket: caveats, blockers, evidence
```

## Tickets needing a decision

### OR-2918

```
=== OR-2918 ===

disposition : aborted
detail      : status is 'Done', not a validate-mode status
ran at      : 2026-10-14T14:27:08Z
verdict     : 
built from  : d638cf09e89aee5c5eaf05bb5922febc390e222c

files: /Users/ryanducharme/.claude/jira-watch/state/results/OR-2918
```

### OR-2946

```
=== OR-2946 ===

disposition : no_merged_pr
detail      : no merged PR within the search window; needs a human disposition
ran at      : 2026-10-14T14:12:29Z
verdict     : 
built from  : 

files: /Users/ryanducharme/.claude/jira-watch/state/results/OR-2946
```

### OR-2966

```
=== OR-2966 ===

disposition : refused
detail      : verdict=inconclusive; verdict is 'inconclusive'
ran at      : 2026-10-14T14:31:18Z
verdict     : inconclusive
built from  : d638cf09e89aee5c5eaf05bb5922febc390e222c

blockers:
  - This ticket only changes Maven build config and GitHub workflows, so nothing can be exercised against the running app and no app-log red check exists; the Maven-level red check above is in scratch/spotbugs-red.log and scratch/pmd-red.log, not the application log.
  - Can Ryan confirm the renamed static-analysis job in maven-ci.yml ran green on the merge of PR #4642 (5bdbfbda0) and on main since, so the baselines actually suppress every existing finding across all twelve modules (locally only orci-utils was run, because the orci module build is too slow for this run)?
  - Has bin/deploy been run end to end since it switched to ./mvnw, to confirm the wrapper download works on the machine that runs deploys?
  - Is it worth a throwaway PR that adds one new High SpotBugs finding to confirm the static-analysis job goes red in CI, as the local run did?

caveats:
  - Local gate exercised on orci-utils only (8 source files, no sibling-module dependencies); the baselines for the other modules were not exercised here.
  - The Medium-threshold SECURITY category gate and the CRLF_INJECTION_LOGS exclusion were not exercised; only a High NP_ALWAYS_NULL finding and a default-ruleset PMD UnusedLocalVariable finding were.
  - The CI workflow changes (static-analysis job, skip flags in the other workflows) were read, not run; a local Maven invocation with the same flags stood in for each job.
  - bin/deploy's switch to ./mvnw was not run.

evidence.positive:
  No app-level surface exists: the ticket delivers root pom.xml execution bindings for spotbugs:check and pmd:check, spotbugs-baseline.xml / pmd-baseline.properties / spotbugs-exclude.xml at the repo root, the renamed static-analysis job in maven-ci.yml, skip flags in maven-cd.yml, site-report.yml, pr-gate.yml and the release plugin arguments, and ./mvnw in bin/deploy. PR #4642 is merged and present

evidence.negative:
  With a deliberate NP_ALWAYS_NULL still injected in TimedProgressMonitor.java, re-ran the same verify with -Dspotbugs.skip=true -Dpmd.skip=true (the flags the gating pr-gate / maven-ci build jobs and maven-cd use). Exit 0, log showed 'Skipping com.github.spotbugs:spotbugs-maven-plugin:4.10.4.1:spotbugs report goal', 'Skipping PMD execution' and BUILD SUCCESS, confirming those jobs are not gated by 

evidence.red_check:
  Not possible against the running app; the red check was done at the Maven level in the worktree and reverted. (1) Injected 'String injected = null; System.out.println(injected.length());' into orci-utils TimedProgressMonitor.start: verify exited 1 with '[ERROR] High: Null pointer dereference of injected in com.guided.orci.service.TimedProgressMonitor.start(String) ... NP_ALWAYS_NULL' and 'Failed t

files: /Users/ryanducharme/.claude/jira-watch/state/results/OR-2966
```

