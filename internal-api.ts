import axios from 'axios';
import fs from 'fs';
import { startBrowser } from './start-browser';
import type { Browser, Page } from 'puppeteer';

const URL_BASE = 'https://chrome.google.com';

export interface AuthData {
  cookieString: string;
  AT: string;
}

enum ImageUploadType {
  SCREENSHOT = 4
}

export interface Screenshot {
  locale: string;
  imageUrls: string[];
}

export interface Project {
  publisherId: string;
  extId: string;
  isPublished: boolean;
  publicKeyArtifact: any;
  screenshots: Array<Screenshot>;

  // Raw protobuf data array. Avoid using this directly.
  detailArray: any;
}

export async function getAuthCredentials(): Promise<AuthData> {
  let browser: Browser | undefined;
  let page: Page | undefined;
  try {
    browser = await startBrowser();
    page = await browser.newPage();
    await page.goto(`${URL_BASE}/webstore/devconsole/`);

    // Wait for the URL to start with the expected pattern for up to 30 seconds
    await page.waitForFunction(
      (expectedUrlStart) => window.location.href.startsWith(expectedUrlStart),
      { timeout: 30000 },
      `${URL_BASE}/webstore/devconsole/`
    );

    const cookies = await browser.cookies();
    const chromeWebStoreCookies = cookies.filter(
      (cookie) => cookie.domain === '.google.com' || cookie.domain === 'chromewebstore.google.com'
    );
    const cookieString = chromeWebStoreCookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');
    const parsedGdData = await page.evaluate(() => window.WIZ_global_data);
    const AT = parsedGdData['SNlM0e'];
    return { cookieString, AT };
  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}

export async function listProjects({
  publisherId,
  authData
}: {
  publisherId: string;
  authData: AuthData;
}): Promise<Project[]> {
  const { data } = await axios.post(
    `${URL_BASE}/_/SnapcatUi/data/batchexecute`,
    {
      'f.req': JSON.stringify([[['mE4CQe', `["${publisherId}",null,null,0,2,[[1]]]`, null, '5']]]),
      at: authData.AT
    },
    {
      headers: getHeaders(authData)
    }
  );
  const parsedData = parseData(data);
  const projects = JSON.parse(parsedData[0][2]);
  return projects[0].map((p: any) => ({
    publisherId,
    extId: p[0],
    detailArray: p[1],
    isPublished: !!p[2],
    publicKeyArtifact: p[3],
    screenshots: (p[1][14] || []).map((item: any) => ({
      locale: item[0],
      imageUrls: (item[7] || []).map((imageItem: any) => imageItem[0]?.[1])
    }))
  }));
}

export async function updateRequest({
  project,
  authData,
  multiLangDescriptions,
  description,
  locale,
  category,
  officialUrl,
  homepageUrl
}: {
  project: Project;
  authData: AuthData;
  multiLangDescriptions?: Record<string, string>;
  description?: string;
  locale?: string;
  category?: string;
  officialUrl?: string;
  homepageUrl?: string;
}) {
  if (description) {
    project.detailArray[20][0][5] = description;
  }
  if (multiLangDescriptions) {
    for (const [locale, localizedDesc] of Object.entries(multiLangDescriptions)) {
      const detailArrayIndex = project.detailArray[20].findIndex((arr: any) => arr[0] === locale);
      if (detailArrayIndex >= 0) {
        project.detailArray[20][detailArrayIndex][5] = localizedDesc;
      }
    }
  }
  if (locale) {
    project.detailArray[9] = locale;
  }
  if (category) {
    project.detailArray[10] = category;
  }
  if (officialUrl) {
    project.detailArray[2] = officialUrl;
  }
  if (homepageUrl) {
    project.detailArray[3] = homepageUrl;
  }

  const { data } = await axios.post(
    `${URL_BASE}/_/SnapcatUi/data/batchexecute`,
    {
      'f.req': JSON.stringify([
        [
          [
            'qhj82d',
            JSON.stringify([[project.extId, project.detailArray, null, project.publicKeyArtifact]]),
            null,
            'generic'
          ]
        ]
      ]),
      at: authData.AT
    },
    {
      headers: getHeaders(authData)
    }
  );
  const parsedData = parseData(data);
  return parsedData;
}

export async function deleteScreenshot({
  project,
  imageUrl,
  authData
}: {
  project: Project;
  imageUrl: string;
  authData: AuthData;
}) {
  await axios.post(
    `${URL_BASE}/_/SnapcatUi/data/batchexecute`,
    {
      'f.req': JSON.stringify([
        [['AaxNP', JSON.stringify([project.extId, [imageUrl]]), null, 'generic']]
      ]),
      at: authData.AT
    },
    {
      headers: getHeaders(authData)
    }
  );

  const { data } = await axios.post(
    `${URL_BASE}/_/SnapcatUi/data/batchexecute`,
    {
      'f.req': JSON.stringify([
        [
          ['Mt2BP', JSON.stringify([project.extId]), null, '1'],
          ['Gloc4c', JSON.stringify([project.extId]), null, '2']
        ]
      ]),
      at: authData.AT
    },
    {
      headers: getHeaders(authData)
    }
  );
  return data;
}

/**
 * Upload a screenshot to the project.
 * @param project The selected project to modify
 * @param imageFile Path to the screenshot file to upload
 * @param locale Leave blank to set the screenshot as global screenshot. Otherwise, it will set to localized screenshot.
 * @param authData
 */
export async function uploadScreenshot({
  project,
  imageFile,
  locale,
  authData
}: {
  project: Project;
  imageFile: string;
  locale?: string;
  authData: AuthData;
}) {
  const imageStat = fs.statSync(imageFile);
  const formData = JSON.stringify({
    protocolVersion: '0.8',
    createSessionRequest: {
      // @ts-ignore
      fields: [
        {
          external: { name: 'file', filename: imageFile, put: {}, size: imageStat.size }
        },
        {
          inlined: {
            name: 'item_id',
            content: project.extId,
            contentType: 'text/plain'
          }
        },
        {
          inlined: {
            name: 'publisher_id',
            content: project.publisherId,
            contentType: 'text/plain'
          }
        },
        {
          inlined: {
            name: 'image_upload_type',
            content: ImageUploadType.SCREENSHOT.toString(),
            contentType: 'text/plain'
          }
        },
        { inlined: { name: 'language_code', content: locale, contentType: 'text/plain' } }
      ]
    }
  });
  const { data } = await axios({
    method: 'POST',
    url: 'https://chrome.google.com/webstore/developer/uploadv4',
    data: formData,
    headers: getHeaders(authData)
  });
  const putUrl = data.sessionStatus.externalFieldTransfers[0].putInfo.url;
  const { data: uploadedResponse } = await axios.post(putUrl, fs.createReadStream(imageFile));
  if (uploadedResponse.sessionStatus.state !== 'FINALIZED') {
    throw new Error('Failed to upload image');
  }
}

function parseData(data: string) {
  return JSON.parse(data.slice(6));
}

function getHeaders(authData: AuthData) {
  return {
    accept: '*/*',
    'x-guploader-client-info': 'mechanism=scotty xhr resumable; clientVersion=788012804',
    'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
    cookie: authData.cookieString
  };
}
