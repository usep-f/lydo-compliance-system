import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { ALLOWED_STORAGE_PREFIXES } from './helpers';
import { writeNotification } from './notifications';
import { recomputePublicAnalytics } from './analytics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminDirectUploadPayload {
  barangay: string;
  documentType: string;
  documentLabel: string;
  category: 'scheduled' | 'asap' | 'perennial';
  period: string;
  year: number;
  accomplishmentCategory?: string | null;
  fileName: string;
  fileSize: number;
  fileStoragePath: string;
  pageCount: number;
  pdfMetadata?: Record<string, unknown>;
  adminNotes?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateDirectUploadPayload(payload: AdminDirectUploadPayload): void {
  if (!payload || typeof payload !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'Payload is required.');
  }
  if (!payload.barangay || typeof payload.barangay !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Valid barangay is required.');
  }
  if (!payload.documentType || typeof payload.documentType !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Valid document type is required.');
  }
  if (!payload.documentLabel || typeof payload.documentLabel !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Valid document label is required.');
  }
  if (!['scheduled', 'asap', 'perennial'].includes(payload.category)) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid category is required.');
  }
  if (!payload.period || typeof payload.period !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Valid period is required.');
  }
  if (!payload.year || typeof payload.year !== 'number') {
    throw new functions.https.HttpsError('invalid-argument', 'Valid year is required.');
  }
  const isAllowedPath = typeof payload.fileStoragePath === 'string' &&
    ALLOWED_STORAGE_PREFIXES.some((prefix) => payload.fileStoragePath.startsWith(prefix));
  if (!isAllowedPath) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid storage path under allowed prefixes is required.');
  }
  if (typeof payload.fileSize !== 'number' || payload.fileSize <= 0 || payload.fileSize > 100 * 1024 * 1024) {
    throw new functions.https.HttpsError('invalid-argument', 'File size must be positive and under 100MB.');
  }
  if (typeof payload.pageCount !== 'number' || payload.pageCount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid page count is required.');
  }
}

async function notifyBarangayUsers(
  db: admin.firestore.Firestore,
  barangay: string,
  documentLabel: string,
  period: string,
  submissionId: string
): Promise<void> {
  try {
    const usersSnapshot = await db.collection('users')
      .where('barangay', '==', barangay)
      .where('role', '==', 'user')
      .get();

    if (usersSnapshot.empty) return;

    const notifPromises = usersSnapshot.docs.map((userDoc) =>
      writeNotification(userDoc.id, {
        type: 'submission_approved',
        title: 'Direct Submission Recorded ✓',
        body: `LYDO Administration uploaded and approved ${documentLabel} (${period}) on behalf of ${barangay}.`,
        metadata: {
          submissionId,
          documentLabel,
          period,
          barangay,
          isDirectAdminUpload: 'true',
        },
      })
    );

    await Promise.all(notifPromises);
  } catch (err) {
    console.warn('Failed to dispatch notifications to barangay users:', err);
  }
}

// ---------------------------------------------------------------------------
// Callable Function: adminDirectUpload
// ---------------------------------------------------------------------------

export const adminDirectUpload = functions.https.onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    // 1. Authentication
    if (!request.auth || !request.auth.token) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const db = admin.firestore();

    // 2. Authorization (Admin Only)
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only administrators can perform direct uploads.');
    }

    const adminName = callerDoc.data()?.fullName || 'LYDO Administration';
    const payload = request.data as AdminDirectUploadPayload;

    // 3. Validation
    validateDirectUploadPayload(payload);

    // 4. Generate deterministic document ID
    const safeBarangay = payload.barangay.replace(/[^a-zA-Z0-9]/g, '_');
    const safePeriod = payload.period.replace(/[^a-zA-Z0-9]/g, '_');
    let submissionId = `${safeBarangay}_${payload.year}_${payload.documentType}_${safePeriod}`;
    if (payload.category === 'perennial') {
      submissionId += `_${Date.now()}`;
    }

    // 5. Build submission document
    const now = admin.firestore.FieldValue.serverTimestamp();
    const submissionData: Record<string, unknown> = {
      userId: request.auth.uid,
      fullName: adminName,
      uploaderRole: 'admin',
      isDirectAdminUpload: true,
      adminNotes: payload.adminNotes?.trim() || null,
      barangay: payload.barangay,
      documentType: payload.documentType,
      documentLabel: payload.documentLabel,
      category: payload.category,
      period: payload.period,
      year: payload.year,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      fileStoragePath: payload.fileStoragePath,
      pageCount: payload.pageCount,
      pdfMetadata: payload.pdfMetadata || {},
      status: 'approved',
      submittedAt: now,
      approvedAt: now,
      approvedBy: request.auth.uid,
    };

    if (payload.accomplishmentCategory) {
      submissionData.accomplishmentCategory = payload.accomplishmentCategory;
    }

    // 6. Transactional Write to 'submissions' & delete matching 'pending_submissions'
    const subRef = db.collection('submissions').doc(submissionId);
    const pendingRef = db.collection('pending_submissions').doc(submissionId);

    await db.runTransaction(async (transaction) => {
      transaction.set(subRef, submissionData);
      transaction.delete(pendingRef);
    });

    // 7. Dispatch in-app notifications to all registered SK Officials of target barangay
    await notifyBarangayUsers(db, payload.barangay, payload.documentLabel, payload.period, submissionId);

    // 8. Trigger analytics recomputation
    await recomputePublicAnalytics(db);

    return {
      success: true,
      submissionId,
      message: `Submission for ${payload.documentLabel} (${payload.period}) successfully logged and approved for ${payload.barangay}.`,
    };
  }
);
