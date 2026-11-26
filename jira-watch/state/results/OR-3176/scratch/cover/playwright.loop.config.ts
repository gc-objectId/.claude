import base from "/Users/ryanducharme/dev/worktrees/OR-3176-warn-when-a-once/qa-suite/playwright.config";

const QA = "/Users/ryanducharme/dev/worktrees/OR-3176-warn-when-a-once/qa-suite";
const projects = (base.projects ?? []).map((p: any) => ({
  ...p,
  testDir: `${QA}/${(p.testDir ?? ".").replace(/^\.\//, "")}`,
}));

export default {
  ...base,
  globalSetup: `${__dirname}/setup.ts`,
  globalTeardown: `${QA}/global-teardown.ts`,
  reporter: [["list"]],
  outputDir: `${__dirname}/test-results`,
  projects,
};
