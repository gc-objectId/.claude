const { chromium } = require("playwright-core");
const EXE = "/Users/ryanducharme/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  console.log("launched", b.version());
  await b.close();
})().catch((e) => console.log("ERR", e.message));
