import path from 'path';
import puppeteer from 'puppeteer';
import os from 'os'

const USER_DIR = path.join(os.tmpdir(), 'chrome-dev-console');

export async function startBrowser() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1600, height: 1000 },
    ignoreDefaultArgs: true,
    args: [
      '--allow-pre-commit-input',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-component-extensions-with-background-pages',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-field-trial-config',
      '--disable-hang-monitor',
      '--disable-infobars',
      '--disable-ipc-flooding-protection',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disable-search-engine-choice-screen',
      '--disable-sync',
      '--no-first-run',
      '--password-store=basic',
      '--use-mock-keychain',
      '--disable-blink-features=AutomationControlled',
      `--user-data-dir=${path.resolve(USER_DIR)}`,
      '--remote-debugging-port=9222',
      '--profile-directory=Auth'
    ],
    userDataDir: USER_DIR,
  });
  return browser;
}
