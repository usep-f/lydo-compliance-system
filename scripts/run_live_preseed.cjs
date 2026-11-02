const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Configuration & Credentials
// ---------------------------------------------------------------------------
const configPath = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = config.tokens?.access_token;

const PROJECT_ID = 'lydo-compliance-system-ce8c3';
const BUCKET_NAME = 'lydo-compliance-system-ce8c3.firebasestorage.app';

if (!token) {
  console.error('Fatal: Missing Firebase access token in firebase-tools.json');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helper: HTTP Requests
// ---------------------------------------------------------------------------
function httpsRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Helper: Download from Google Drive with redirect support
async function downloadDriveFile(fileId) {
  const initialUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  return new Promise((resolve, reject) => {
    https.get(initialUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (res2) => {
          const chunks = [];
          res2.on('data', c => chunks.push(c));
          res2.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

// Helper: Upload file to Firebase Cloud Storage
async function uploadToStorage(storagePath, buffer, mimeType) {
  const uploadPath = `/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
  const res = await httpsRequest({
    hostname: 'storage.googleapis.com',
    path: uploadPath,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': mimeType,
      'Content-Length': buffer.length
    }
  }, buffer);

  if (res.statusCode !== 200) {
    throw new Error(`Storage upload failed (${res.statusCode}): ${res.body.toString()}`);
  }

  // Construct standard public download URL
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(storagePath)}?alt=media`;
}

// Helper: Firestore Document Read
async function getFirestoreDoc(collection, docId) {
  const res = await httpsRequest({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${encodeURIComponent(docId)}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.statusCode === 200) {
    return JSON.parse(res.body.toString());
  }
  return null;
}

// Helper: Firestore Document Write (Create / Overwrite)
async function writeFirestoreDoc(collection, docId, fields) {
  const res = await httpsRequest({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${encodeURIComponent(docId)}`,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({ fields }));

  if (res.statusCode !== 200) {
    throw new Error(`Firestore write failed (${res.statusCode}): ${res.body.toString()}`);
  }
  return JSON.parse(res.body.toString());
}

// Helper: Convert JS object to Firestore typed fields
function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      fields[k] = { nullValue: null };
    } else if (typeof v === 'string') {
      if (k.endsWith('At') || k.endsWith('Date') || k === 'creationDate') {
        fields[k] = { timestampValue: v };
      } else {
        fields[k] = { stringValue: v };
      }
    } else if (typeof v === 'number') {
      if (Number.isInteger(v)) {
        fields[k] = { integerValue: String(v) };
      } else {
        fields[k] = { doubleValue: v };
      }
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v };
    } else if (typeof v === 'object' && !Array.isArray(v)) {
      fields[k] = { mapValue: { fields: toFirestoreFields(v) } };
    }
  }
  return fields;
}

// Helper: Estimate human name from email
function formatNameFromEmail(email) {
  const userPart = email.split('@')[0].replace(/[0-9._-]+/g, ' ').trim();
  if (!userPart || userPart.length < 3) return 'SK Official';
  return userPart.split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Helper: Convert Drive tag/date to ISO Timestamp
function resolveDriveDate(driveDateStr, period) {
  const now = new Date();
  let year = 2026;
  let month = 2; // Default March (0-indexed)
  let day = 15;

  // Month resolution from string
  const lower = (driveDateStr || '').toLowerCase();
  if (lower.includes('ene')) month = 0;
  else if (lower.includes('peb')) month = 1;
  else if (lower.includes('mar')) month = 2;
  else if (lower.includes('abr')) month = 3;
  else if (lower.includes('may')) month = 4;
  else if (lower.includes('hun')) month = 5;
  else if (lower.includes('hul')) month = 6;
  else if (lower.includes('ago')) month = 7;
  else if (lower.includes('set')) month = 8;
  else if (lower.includes('okt')) month = 9;
  else if (lower.includes('nob')) month = 10;
  else if (lower.includes('dis')) month = 11;

  // If period specified (e.g. 2026-04 or 2026-Q2)
  if (period && period.startsWith('2026-')) {
    const pPart = period.replace('2026-', '');
    if (pPart.startsWith('Q')) {
      const q = parseInt(pPart[1]);
      month = (q - 1) * 3 + 2; // End of quarter
    } else if (pPart.startsWith('S')) {
      const s = parseInt(pPart[1]);
      month = s === 1 ? 5 : 11;
    } else {
      const m = parseInt(pPart);
      if (!isNaN(m)) month = m - 1;
    }
  }

  const d = new Date(Date.UTC(year, month, day, 9, 30, 0));
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Main Pre-seeding Execution
// ---------------------------------------------------------------------------
async function main() {
  console.log('====================================================');
  console.log('   LYDO COMPLIANCE SYSTEM — LIVE PRE-SEEDING RUN    ');
  console.log('====================================================\n');

  // Load crawled files and uploaders
  const uploadersFilePath = fs.existsSync('all_eligible_uploaders.json') 
    ? 'all_eligible_uploaders.json' 
    : path.join(__dirname, '..', '..', 'all_eligible_uploaders.json');
  const { fileUploaderMap, summary } = JSON.parse(fs.readFileSync(uploadersFilePath, 'utf8'));
  console.log(`Loaded ${fileUploaderMap.length} eligible documents across ${Object.keys(summary).length} uploaders.\n`);

  // STEP 1: Load Existing Users from Firestore
  console.log('--- Step 1: Resolving and Provisioning Accounts ---');
  const existingUsersRes = await httpsRequest({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const existingDocs = JSON.parse(existingUsersRes.body.toString()).documents || [];
  const usersByEmail = new Map();

  existingDocs.forEach(d => {
    const f = d.fields || {};
    const email = f.email?.stringValue?.toLowerCase();
    const uid = d.name.split('/').pop();
    if (email) {
      usersByEmail.set(email, {
        uid,
        email: f.email?.stringValue,
        fullName: f.fullName?.stringValue || 'SK Official',
        barangay: f.barangay?.stringValue || 'Lucena City',
        role: f.role?.stringValue || 'user',
        isExisting: true
      });
    }
  });

  // Blacklist fake Market View test accounts
  const blacklistedEmails = new Set(['qcmler2468@minitts.net', 'venreijoseph@gmail.com']);

  // Provision new accounts for uploaders not yet in Firestore
  for (const [email, info] of Object.entries(summary)) {
    const emailLower = email.toLowerCase();
    if (blacklistedEmails.has(emailLower)) continue;

    if (!usersByEmail.has(emailLower)) {
      const primaryBarangay = info.barangays[0] || 'Lucena City';
      const cleanName = formatNameFromEmail(email);
      // Generate deterministic UID from email
      const uid = 'preseed_' + crypto.createHash('md5').update(emailLower).digest('hex').substring(0, 20);

      const userRecord = {
        fullName: cleanName,
        email: email,
        role: 'user',
        uid: uid,
        barangay: primaryBarangay,
        status: 'approved',
        approvedAt: new Date(Date.UTC(2026, 0, 1)).toISOString(),
        isPreseeded: true
      };

      console.log(`[PROVISION] Creating user: ${email} (${cleanName}) -> ${primaryBarangay}`);
      await writeFirestoreDoc('users', uid, toFirestoreFields(userRecord));

      usersByEmail.set(emailLower, { ...userRecord, isExisting: false });
    } else {
      const existing = usersByEmail.get(emailLower);
      console.log(`[RETAINED] Existing user preserved: ${existing.email} (${existing.fullName})`);
    }
  }

  console.log(`\nAccount resolution complete: ${usersByEmail.size} total active official profiles available.\n`);

  // STEP 2: Ingest 160 Submissions
  console.log('--- Step 2: Ingesting 160 Compliance Documents ---');
  let successCount = 0;
  let skippedAlreadyExists = 0;
  let failCount = 0;

  for (let i = 0; i < fileUploaderMap.length; i++) {
    const f = fileUploaderMap[i];
    const uploaderEmail = (f.uploaders[0] || '').toLowerCase();
    const targetUser = usersByEmail.get(uploaderEmail) || Array.from(usersByEmail.values()).find(u => u.barangay === f.barangay && !blacklistedEmails.has(u.email.toLowerCase())) || {
      uid: 'system_preseed_user',
      fullName: `SK Official (${f.barangay})`,
      barangay: f.barangay
    };

    // Construct deterministic Submission Document ID
    const safeBarangay = f.barangay.replace(/[^a-zA-Z0-9]/g, '_');
    const safePeriod = f.period.replace(/[^a-zA-Z0-9]/g, '_');
    const safeDocType = f.category.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    
    // Perennials require unique file suffix; scheduled use deterministic period key
    let submissionId = `${safeBarangay}_2026_${safeDocType}_${safePeriod}`;
    if (f.period === '2026' || f.period === 'ASAP') {
      submissionId += `_${f.fileId.substring(0, 10)}`;
    }

    process.stdout.write(`[${i + 1}/${fileUploaderMap.length}] ${f.barangay} — "${f.fileName}"... `);

    try {
      // 1. Check idempotency: already ingested?
      const existingDoc = await getFirestoreDoc('submissions', submissionId);
      if (existingDoc) {
        console.log(`(Already ingested, skipping ✓)`);
        skippedAlreadyExists++;
        continue;
      }

      // 2. Download from Google Drive
      const fileBuffer = await downloadDriveFile(f.fileId);
      if (fileBuffer.length === 0) {
        throw new Error('Downloaded 0 bytes from Google Drive');
      }

      // Determine MIME type
      let mimeType = 'application/pdf';
      const ext = path.extname(f.fileName).toLowerCase();
      if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === '.xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      // 3. Upload to Firebase Cloud Storage
      const storagePath = `submission_files/${targetUser.uid}/2026/${safeBarangay}/${safeDocType}/${submissionId}_${f.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const downloadUrl = await uploadToStorage(storagePath, fileBuffer, mimeType);

      // 4. Resolve exact historical Google Drive date
      const driveIsoDate = resolveDriveDate(f.driveDate, f.period);

      // 5. Create Approved Submission in Firestore
      const submissionData = {
        userId: targetUser.uid,
        fullName: targetUser.fullName,
        barangay: f.barangay,
        documentType: safeDocType,
        documentLabel: f.category,
        category: (f.period.includes('Q') || f.period.includes('2026-0') || f.period.includes('2026-1')) ? 'scheduled' : f.period === 'ASAP' ? 'asap' : 'perennial',
        period: f.period,
        year: 2026,
        fileName: f.fileName,
        fileSize: fileBuffer.length,
        fileStoragePath: storagePath,
        fileUrl: downloadUrl,
        pageCount: 1,
        pdfMetadata: {
          title: f.fileName,
          producer: 'Google Drive Pre-Seeding Pipeline',
          creationDate: driveIsoDate
        },
        status: 'approved',
        submittedAt: driveIsoDate,
        approvedAt: driveIsoDate,
        approvedBy: 'SYSTEM_PRESEED',
        isPreseeded: true
      };

      await writeFirestoreDoc('submissions', submissionId, toFirestoreFields(submissionData));
      console.log(`Uploaded & Approved ✓`);
      successCount++;
    } catch (err) {
      console.log(`FAILED ✗: ${err.message}`);
      failCount++;
    }
  }

  console.log('\n====================================================');
  console.log('              PRE-SEEDING RUN SUMMARY               ');
  console.log('====================================================');
  console.log(`Total Documents Processed: ${fileUploaderMap.length}`);
  console.log(`Successfully Ingested:    ${successCount}`);
  console.log(`Skipped (Already Present):${skippedAlreadyExists}`);
  console.log(`Failed:                   ${failCount}`);
  console.log('====================================================\n');

  // Trigger Analytics recomputation if applicable
  console.log('Done! All records written directly to live Firestore & Cloud Storage.');
}

main().catch(console.error);
