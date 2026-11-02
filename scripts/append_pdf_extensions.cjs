const fs = require('fs');
const path = require('path');
const https = require('https');

const configPath = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = config.tokens?.access_token;
const PROJECT_ID = 'lydo-compliance-system-ce8c3';

function httpsRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Checking submissions for missing file extensions...');
  let pageToken = '';
  const allDocs = [];

  do {
    const q = pageToken ? `?pageToken=${pageToken}&pageSize=300` : '?pageSize=300';
    const res = await httpsRequest({
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/submissions${q}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const parsed = JSON.parse(res.body);
    allDocs.push(...(parsed.documents || []));
    pageToken = parsed.nextPageToken || '';
  } while (pageToken);

  let patched = 0;
  for (const doc of allDocs) {
    const docId = doc.name.split('/').pop();
    const fn = doc.fields.fileName?.stringValue || '';

    // If fileName does not have an extension (.pdf, .docx, .xlsx)
    if (!fn.includes('.')) {
      const updatedFn = `${fn}.pdf`;
      const patchRes = await httpsRequest({
        hostname: 'firestore.googleapis.com',
        path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/submissions/${encodeURIComponent(docId)}?updateMask.fieldPaths=fileName`,
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }, JSON.stringify({
        fields: {
          fileName: { stringValue: updatedFn }
        }
      }));

      if (patchRes.statusCode === 200) {
        patched++;
      }
    }
  }

  console.log(`Successfully patched ${patched} submissions with proper .pdf extensions!`);
}

run().catch(console.error);
