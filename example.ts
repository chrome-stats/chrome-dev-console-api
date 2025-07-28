import { getAuthCredentials, listProjects, updateRequest } from './index';

// https://chrome.google.comwebstore/devconsole/<publisher_id>/<extension_id>

const PUBLISHER_ID = '<publisher_id>';
const EXT_ID = '<ext-id>';

async function run() {
  const authData = await getAuthCredentials();
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
  console.log(`Projects: ${projects}`);
}

run();
