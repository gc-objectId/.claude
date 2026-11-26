import { request as playwrightRequest } from "/Users/ryanducharme/dev/worktrees/OR-3176-warn-when-a-once/qa-suite/node_modules/@playwright/test";
import {
  ignoreHTTPSErrors,
  mintAdminApiToken,
} from "/Users/ryanducharme/dev/worktrees/OR-3176-warn-when-a-once/qa-suite/fixtures/auth";

export default async function setup(): Promise<void> {
  const baseURL = process.env.BASE_URL!;
  const sessionContext = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors,
  });
  try {
    process.env.ADMIN_API_TOKEN = await mintAdminApiToken(
      sessionContext,
      baseURL,
      "qa-suite",
    );
  } finally {
    await sessionContext.dispose();
  }
}
