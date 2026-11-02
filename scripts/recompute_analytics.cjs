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

const BARANGAYS = [
  "Barangay 1 (Poblacion)", "Barangay 2 (Poblacion)", "Barangay 3 (Poblacion)", 
  "Barangay 4 (Poblacion)", "Barangay 5 (Poblacion)", "Barangay 6 (Poblacion)", 
  "Barangay 7 (Poblacion)", "Barangay 8 (Poblacion)", "Barangay 9 (Poblacion)", 
  "Barangay 10 (Poblacion)", "Barangay 11 (Poblacion)", "Barra", "Bocohan", 
  "Cotta", "Dalahican", "Domoit", "Gulang-Gulang", "Ibabang Dupay", 
  "Ibabang Iyam", "Ibabang Talim", "Ilayang Dupay", "Ilayang Iyam", 
  "Ilayang Talim", "Isabang", "Market View", "Mayao Castillo", "Mayao Crossing", 
  "Mayao Kanluran", "Mayao Parada", "Mayao Silangan", "Ransohan", "Salinas", 
  "Talao-Talao"
];

const SCHEDULED_TYPES = [
  { id: 'full_disclosure', label: 'Full Disclosure Policy Board', frequency: 'quarterly' },
  { id: 'regular_session_minutes', label: 'Regular Session Minutes of the Meeting', frequency: 'monthly' },
  { id: 'kk_minutes', label: 'Katipunan ng Kabataan Minutes of the Meeting', frequency: 'semestral' }
];

const ASAP_TYPES = [
  { id: 'directory_sk_officials', label: 'Directory of SK Officials' },
  { id: 'kk_profiling', label: 'KK Profiling' },
  { id: 'list_youth_orgs', label: 'List of Youth Organizations' }
];

function getElapsedPeriods(frequency, year, date) {
  const currentMonth = date.getMonth(); // 0-11
  const results = [];
  if (frequency === 'monthly') {
    for (let m = 0; m <= currentMonth; m++) {
      results.push(`${year}-${String(m + 1).padStart(2, '0')}`);
    }
  } else if (frequency === 'quarterly') {
    const currentQ = Math.floor(currentMonth / 3) + 1;
    for (let q = 1; q <= currentQ; q++) {
      results.push(`${year}-Q${q}`);
    }
  } else if (frequency === 'semestral') {
    const currentS = currentMonth >= 6 ? 2 : 1;
    for (let s = 1; s <= currentS; s++) {
      results.push(`${year}-S${s}`);
    }
  }
  return results;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') {
    if (val.endsWith('Z') && val.includes('T')) return { timestampValue: val };
    return { stringValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function run() {
  console.log('Fetching live submissions & users...');
  const currentYear = 2026;
  const now = new Date();

  // 1. Gather expected items
  const expectedChecklistItems = [];
  SCHEDULED_TYPES.forEach(type => {
    const elapsed = getElapsedPeriods(type.frequency, currentYear, now);
    elapsed.forEach(period => {
      expectedChecklistItems.push({ id: `${type.id}_${period}`, label: `${type.label} (${period})` });
    });
  });
  ASAP_TYPES.forEach(type => {
    expectedChecklistItems.push({ id: `${type.id}_ASAP`, label: type.label });
  });

  // 2. Fetch all submissions
  let pageToken = '';
  const allSubs = [];
  do {
    const q = pageToken ? `?pageToken=${pageToken}&pageSize=300` : '?pageSize=300';
    const res = await httpsRequest({
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/submissions${q}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const parsed = JSON.parse(res.body);
    allSubs.push(...(parsed.documents || []));
    pageToken = parsed.nextPageToken || '';
  } while (pageToken);

  const approvedSubmissions = allSubs.map(d => {
    const f = d.fields;
    return {
      barangay: f.barangay?.stringValue,
      documentType: f.documentType?.stringValue,
      period: f.period?.stringValue,
      status: f.status?.stringValue
    };
  });

  // 3. Fetch active users count
  const usersRes = await httpsRequest({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users?pageSize=300`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const usersDocs = JSON.parse(usersRes.body).documents || [];
  const activeUsersCount = usersDocs.filter(d => d.fields.role?.stringValue !== 'admin').length;

  // 4. Compute compliance per barangay
  const barangayBreakdown = {};
  const barangayRanking = [];
  let fullyCompliantCount = 0;
  let activeBarangaysCount = 0;
  let totalComplianceSum = 0;

  BARANGAYS.forEach(brgy => {
    const checklist = {};
    expectedChecklistItems.forEach(item => {
      checklist[item.id] = 'missing';
    });

    let totalScheduledExpected = 0;
    let totalScheduledApproved = 0;

    // Scheduled submissions
    SCHEDULED_TYPES.forEach(dt => {
      const elapsed = getElapsedPeriods(dt.frequency, currentYear, now);
      totalScheduledExpected += elapsed.length;
      elapsed.forEach(period => {
        const isApproved = approvedSubmissions.some(
          s => s.barangay?.trim() === brgy && s.documentType === dt.id && s.period === period
        );
        if (isApproved) {
          totalScheduledApproved++;
          checklist[`${dt.id}_${period}`] = 'compliant';
        }
      });
    });

    // ASAP submissions
    ASAP_TYPES.forEach(dt => {
      const isApproved = approvedSubmissions.some(
        s => s.barangay?.trim() === brgy && s.documentType === dt.id && (s.period === 'ASAP' || !s.period)
      );
      if (isApproved) {
        checklist[`${dt.id}_ASAP`] = 'compliant';
      }
    });

    const complianceRate = totalScheduledExpected > 0
      ? Math.round((totalScheduledApproved / totalScheduledExpected) * 100)
      : 100;

    if (complianceRate === 100) fullyCompliantCount++;
    if (totalScheduledApproved > 0) activeBarangaysCount++;
    totalComplianceSum += complianceRate;

    const bData = {
      barangay: brgy,
      expectedCount: totalScheduledExpected,
      submittedCount: totalScheduledApproved,
      complianceRate,
      checklist
    };

    barangayBreakdown[brgy] = bData;
    barangayRanking.push(bData);
  });

  barangayRanking.sort((a, b) => {
    if (b.complianceRate !== a.complianceRate) return b.complianceRate - a.complianceRate;
    return a.barangay.localeCompare(b.barangay);
  });

  const overallRate = BARANGAYS.length > 0 ? Math.round(totalComplianceSum / BARANGAYS.length) : 0;

  const publicAnalytics = {
    overallRate,
    fullyCompliantCount,
    activeBarangaysCount,
    activeUsersCount,
    totalSubmissionsCount: approvedSubmissions.length,
    barangayRanking,
    barangayBreakdown,
    updatedAt: new Date().toISOString()
  };

  console.log(`Writing public_analytics: Overall Rate: ${overallRate}%, Active Barangays: ${activeBarangaysCount}, Total Submissions: ${approvedSubmissions.length}`);

  const firestoreFields = {};
  for (const [k, v] of Object.entries(publicAnalytics)) {
    firestoreFields[k] = toFirestoreValue(v);
  }

  const patchRes = await httpsRequest({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/public_analytics`,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({ fields: firestoreFields }));

  if (patchRes.statusCode === 200) {
    console.log('Successfully updated settings/public_analytics document!');
  } else {
    console.error('Update failed:', patchRes.body);
  }
}

run().catch(console.error);
