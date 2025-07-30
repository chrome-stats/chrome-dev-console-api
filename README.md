# chrome-dev-console-api

API to update Chrome Developer Console programmatically.

The public [Chrome Web Store API](https://developer.chrome.com/docs/webstore/api) does not allow updating the listing details programmatically, so we created this to help with that.

This relies on Puppeteer to login to Chrome Web Store, then uses the signed-in cookies update the Chrome Web Store projects.

This project relies on undocumented API and is a work-in-progress. Use at your own risk!

```typescript
import { getAuthCredentials, listProjects, updateRequest, uploadScreenshot } from './index';
import fs from 'fs';

// https://chrome.google.comwebstore/devconsole/<publisher_id>/<extension_id>

const PUBLISHER_ID = <string>process.env.PUBLISHER_ID;
const EXT_ID = <string>process.env.EXT_ID;

const CACHED_AUTH_DATA_FILE = './cached-auth-data.json';

async function run() {
    // Auth data can be cached for a few days. Afterward the cookies will expire and require reauth.
    // Do not share the auth data with anyone or they might gain access to your Google accounts.
    let authData = undefined;
    if (fs.existsSync(CACHED_AUTH_DATA_FILE)) {
        authData = JSON.parse(fs.readFileSync(CACHED_AUTH_DATA_FILE, 'utf-8'));
    } else {
        authData = await getAuthCredentials();
        fs.writeFileSync(CACHED_AUTH_DATA_FILE, JSON.stringify(authData));
    }
    const projects = await listProjects({ publisherId: PUBLISHER_ID, authData });
    const selectedProject = projects.find((p: any) => p.extId === EXT_ID);
    await updateRequest({
        project: selectedProject,
        authData,
        multiLangDescriptions: {
            en: 'Test English',
            'zh-CN': 'Test Chinese'
        }
    });
    await uploadScreenshot({
        publisherId: PUBLISHER_ID,
        extId: EXT_ID,
        imageFile: 'screenshot-en.png',
        locale: 'en',
        authData
    });
    await uploadScreenshot({
        publisherId: PUBLISHER_ID,
        extId: EXT_ID,
        imageFile: 'screenshot-zh-CN.png',
        locale: 'zh-CN',
        authData
    });
    // No setting locale parameter will upload the screenshot as global
    await uploadScreenshot({
        publisherId: PUBLISHER_ID,
        extId: EXT_ID,
        imageFile: 'screenshot-global.png',
        authData
    });
    console.log(`Projects: ${projects}`);
}

run();
```
