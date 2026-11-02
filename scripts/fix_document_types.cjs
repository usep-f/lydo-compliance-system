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

// Canonical type mapping
const TYPE_MAPPING = {
  'directory_of_sk_officials': 'directory_sk_officials',
  'list_of_youth_organizations': 'list_youth_orgs',
  'full_disclosure_policy_board': 'full_disclosure',
  'regular_session_minutes_of_the_meeting': 'regular_session_minutes',
  'accomplishment_report__governance_': 'accomplishment_report'
};

async function fixDocumentTypes() {
  console.log('Fetching all submissions from Firestore...');
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

  console.log(`Found ${allDocs.length} total submissions.`);

  let updatedCount = 0;

  for (const doc of allDocs) {
    const docId = doc.name.split('/').pop();
    const fields = doc.fields;
    const currentType = fields.documentType?.stringValue;

    if (TYPE_MAPPING[currentType]) {
      const correctType = TYPE_MAPPING[currentType];
      const patchFields = {
        documentType: { stringValue: correctType }
      };

      if (currentType === 'accomplishment_report__governance_') {
        patchFields.accomplishmentCategory = { stringValue: 'governance' };
      }

      // Update in Firestore
      const patchRes = await httpsRequest({
        hostname: 'firestore.googleapis.com',
        path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/submissions/${encodeURIComponent(docId)}?updateMask.fieldPaths=documentType${currentType.includes('accomplishment') ? '&updateMask.fieldPaths=accomplishmentCategory' : ''}`,
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }, JSON.stringify({ fields: patchFields }));

      if (patchRes.statusCode === 200) {
        updatedCount++;
      } else {
        console.error(`Failed to update ${docId}:`, patchRes.body);
      }
    }
  }

  console.log(`Successfully normalized ${updatedCount} submissions to canonical documentType IDs!`);
}

fixDocumentTypes().catch(console.error);
