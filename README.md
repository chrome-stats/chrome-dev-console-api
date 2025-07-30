# chrome-dev-console-api

API to update Chrome Developer Console programmatically.

The public [Chrome Web Store API](https://developer.chrome.com/docs/webstore/api) does not allow updating the listing details programmatically, so we created this to help with that.

This relies on Puppeteer to login to Chrome Web Store, then uses the signed-in cookies update the Chrome Web Store projects.

This project relies on undocumented API and is a work-in-progress. Use at your own risk!

See [example.ts](./example.ts) for how to use this API.
