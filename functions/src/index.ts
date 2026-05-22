import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage().bucket();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Only files under these prefixes are eligible for deletion. */
const ALLOWED_STORAGE_PREFIXES = ['temp_proofs/', 'submission_files/'];

/** Maximum allowed length for a denial reason string. */
const MAX_REASON_LENGTH = 1000;

/** Maximum allowed length for an application ID (Firestore doc IDs cap at 1500 bytes). */
const MAX_ID_LENGTH = 128;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escapes user-controlled strings before embedding them in HTML email bodies.
 * Prevents HTML/script injection in outbound emails.
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates that an application ID is a safe, non-empty string of reasonable length.
 * Rejects slashes to prevent path traversal into nested Firestore sub-collections.
 */
function validateApplicationId(id: unknown): asserts id is string {
  if (
    typeof id !== 'string' ||
    id.trim().length === 0 ||
    id.length > MAX_ID_LENGTH ||
    id.includes('/')
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid Application ID is required.'
    );
  }
}

/**
 * Validates that a denial reason is a non-empty string within the allowed length.
 */
function validateReason(reason: unknown): asserts reason is string {
  if (
    typeof reason !== 'string' ||
    reason.trim().length === 0 ||
    reason.length > MAX_REASON_LENGTH
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Reason must be a non-empty string of at most ${MAX_REASON_LENGTH} characters.`
    );
  }
}

/**
 * Sends a transactional email using Brevo's v3 SMTP API.
 * Uses native fetch (available in Node.js 18+) so no extra SDK is needed.
 */
async function sendEmailViaBrevo(
  toEmail: string,
  toName: string,
  subject: string,
  htmlContent: string
) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    console.warn(
      'Brevo credentials (BREVO_API_KEY or BREVO_SENDER_EMAIL) are not set in the environment. Skipping email.'
    );
    return { success: false, error: 'Credentials not set' };
  }

  try {
    console.log(`Sending email to ${toEmail} using Brevo...`);
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Lydo Compliance',
          email: senderEmail,
        },
        to: [{ email: toEmail, name: toName }],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Brevo API returned error status ${response.status}:`, errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    console.log('Brevo email sent successfully:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Failed to send email via Brevo:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Safely deletes a proof file from Cloud Storage.
 * Skips deletion if the path does not start with the expected prefix,
 * preventing an attacker-controlled path from deleting arbitrary files.
 */
async function safeDeleteStorageFile(storagePath: unknown): Promise<void> {
  if (
    typeof storagePath !== 'string' ||
    !ALLOWED_STORAGE_PREFIXES.some((prefix) => storagePath.startsWith(prefix))
  ) {
    console.warn('Skipping storage deletion — path is missing or outside allowed prefix:', storagePath);
    return;
  }

  try {
    await storage.file(storagePath).delete();
  } catch (e) {
    console.error('Failed to delete storage file:', e);
  }
}

// ---------------------------------------------------------------------------
// Cloud Functions
// ---------------------------------------------------------------------------

export const approveUser = functions.https.onCall(
  {
    // Resource constraints to limit billing exposure and cap concurrency
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    // 1. Authentication check
    if (!request.auth || !request.auth.token) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    // 2. Authorization check — caller must be an admin
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can approve users.');
    }

    // 3. Input validation
    const { applicationId } = request.data;
    validateApplicationId(applicationId);

    // 4. Fetch and lock the pending application via Transaction
    const pendingRef = db.collection('pending_users').doc(applicationId);
    let applicantData: any;

    try {
      applicantData = await db.runTransaction(async (transaction) => {
        const pendingDoc = await transaction.get(pendingRef);

        if (!pendingDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'Application not found or already processed.');
        }

        const data = pendingDoc.data();
        if (!data || !data.email) {
          throw new functions.https.HttpsError('internal', 'Invalid application data.');
        }

        // Delete Pending Document within transaction to guarantee uniqueness
        transaction.delete(pendingRef);
        return data;
      });
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('Transaction error:', error);
      throw new functions.https.HttpsError('internal', 'Failed to acquire application lock.');
    }

    try {
      // 5. Create Auth User
      const userRecord = await admin.auth().createUser({
        email: applicantData.email,
        displayName: applicantData.fullName,
        emailVerified: true,
      });

      // 6. Generate Password Reset Link
      const defaultResetLink = await admin.auth().generatePasswordResetLink(applicantData.email);
      const urlParts = new URL(defaultResetLink);
      const customResetLink = `https://lydo-compliance-system-ce8c3.firebaseapp.com/setup-password${urlParts.search}`;

      // 7. Move to Users Collection
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        fullName: applicantData.fullName,
        email: applicantData.email,
        barangay: applicantData.barangay,
        role: 'user',
        status: 'approved',
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 8. Safe delete storage proof file (path-traversal protected)
      await safeDeleteStorageFile(applicantData.proofStoragePath);

      // 10. Send approval email — escape user-supplied values before embedding in HTML
      await sendEmailViaBrevo(
        applicantData.email,
        escapeHtml(applicantData.fullName ?? ''),
        'Application Approved - Set Your Password',
        `<h1>Welcome to Lydo Compliance System</h1>
         <p>Dear ${escapeHtml(applicantData.fullName ?? 'SK Official')},</p>
         <p>Your SK Official application has been approved.</p>
         <p>Please <a href="${customResetLink}">click here to set your password</a>.</p>`
      );

      return { success: true, message: 'User approved and email sent.' };
    } catch (error: any) {
      // Log full error server-side; return a generic message to the client
      // to avoid leaking Firestore paths, Auth internals, or stack traces.
      console.error('Approval error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred. Please try again.'
      );
    }
  }
);

export const denyUser = functions.https.onCall(
  {
    // Resource constraints to limit billing exposure and cap concurrency
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    // 1. Authentication check
    if (!request.auth || !request.auth.token) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    // 2. Authorization check — caller must be an admin
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can deny users.');
    }

    // 3. Input validation
    const { applicationId, reason } = request.data;
    validateApplicationId(applicationId);
    validateReason(reason);

    // 4. Fetch and lock the pending application via Transaction
    const pendingRef = db.collection('pending_users').doc(applicationId);
    let applicantData: any;

    try {
      applicantData = await db.runTransaction(async (transaction) => {
        const pendingDoc = await transaction.get(pendingRef);

        if (!pendingDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'Application not found or already processed.');
        }

        const data = pendingDoc.data();

        // Delete Pending Document within transaction to guarantee uniqueness
        transaction.delete(pendingRef);
        return data;
      });
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('Transaction error:', error);
      throw new functions.https.HttpsError('internal', 'Failed to acquire application lock.');
    }

    try {
      // 5. Safe delete storage proof file (path-traversal protected)
      await safeDeleteStorageFile(applicantData?.proofStoragePath);

      // 7. Send rejection email — escape all user-supplied values before embedding in HTML
      if (applicantData?.email) {
        await sendEmailViaBrevo(
          applicantData.email,
          escapeHtml(applicantData.fullName ?? 'SK Official'),
          'Application Denied - Lydo Compliance System',
          `<h1>Application Status Update</h1>
           <p>Dear ${escapeHtml(applicantData.fullName ?? 'SK Official')},</p>
           <p>We regret to inform you that your application has been denied.</p>
           <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>`
        );
      }

      return { success: true, message: 'User denied and email sent.' };
    } catch (error: any) {
      // Log full error server-side; return a generic message to the client
      // to avoid leaking Firestore paths, Auth internals, or stack traces.
      console.error('Denial error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred. Please try again.'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// updateUser — Admin edits an existing user's email, password, fullName, or barangay.
// Role is intentionally excluded and can never be changed through this function.
// ---------------------------------------------------------------------------

export const updateUser = functions.https.onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    // 1. Authentication check
    if (!request.auth || !request.auth.token) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    // 2. Authorization check — caller must be an admin
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can update users.');
    }

    // 3. Extract and validate the target UID
    const { uid, email, password, fullName, barangay } = request.data;

    if (typeof uid !== 'string' || uid.trim().length === 0 || uid.includes('/')) {
      throw new functions.https.HttpsError('invalid-argument', 'A valid user UID is required.');
    }

    // 4. Block self-editing — admins cannot modify their own account through this function
    if (request.auth.uid === uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Admins cannot edit their own account through this panel.'
      );
    }

    // 5. Fetch the target user's Firestore document to check their role
    const targetDoc = await db.collection('users').doc(uid).get();
    if (!targetDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Target user not found.');
    }
    if (targetDoc.data()?.role === 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Admin accounts cannot be edited through this panel.'
      );
    }

    // 6. Validate optional fields and ensure at least one field is being updated
    const authUpdate: { email?: string; password?: string } = {};
    const firestoreUpdate: { email?: string; fullName?: string; barangay?: string } = {};

    if (email !== undefined && email !== null) {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new functions.https.HttpsError('invalid-argument', 'A valid email address is required.');
      }
      authUpdate.email = email.trim();
      firestoreUpdate.email = email.trim();
    }

    // Password is only updated if explicitly provided and non-empty
    if (password !== undefined && password !== null && password !== '') {
      if (typeof password !== 'string' || password.length < 6) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Password must be at least 6 characters long.'
        );
      }
      authUpdate.password = password;
    }

    if (fullName !== undefined && fullName !== null) {
      if (typeof fullName !== 'string' || fullName.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Full name must be a non-empty string.');
      }
      firestoreUpdate.fullName = fullName.trim();
    }

    if (barangay !== undefined && barangay !== null) {
      if (typeof barangay !== 'string' || barangay.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Barangay must be a non-empty string.');
      }
      firestoreUpdate.barangay = barangay.trim();
    }

    // Reject no-op calls — at least one field must be changing
    const hasAuthUpdate = Object.keys(authUpdate).length > 0;
    const hasFirestoreUpdate = Object.keys(firestoreUpdate).length > 0;
    if (!hasAuthUpdate && !hasFirestoreUpdate) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'At least one field (email, password, fullName, or barangay) must be provided.'
      );
    }

    try {
      // 7. Apply Auth update (email and/or password) if there are changes
      if (hasAuthUpdate) {
        await admin.auth().updateUser(uid, authUpdate);
      }

      // 8. Apply Firestore update for profile fields
      if (hasFirestoreUpdate) {
        await db.collection('users').doc(uid).update(firestoreUpdate);
      }

      return { success: true, message: 'User updated successfully.' };
    } catch (error: any) {
      console.error('Update user error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred. Please try again.'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// deleteUser — Admin permanently deletes a user from Firebase Auth and Firestore.
// Cannot target admin-role accounts or the caller's own account.
// ---------------------------------------------------------------------------

export const deleteUser = functions.https.onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    // 1. Authentication check
    if (!request.auth || !request.auth.token) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    // 2. Authorization check — caller must be an admin
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users.');
    }

    // 3. Validate the target UID
    const { uid } = request.data;

    if (typeof uid !== 'string' || uid.trim().length === 0 || uid.includes('/')) {
      throw new functions.https.HttpsError('invalid-argument', 'A valid user UID is required.');
    }

    // 4. Block self-deletion
    if (request.auth.uid === uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Admins cannot delete their own account.'
      );
    }

    // 5. Fetch the target user to check their role
    const targetDoc = await db.collection('users').doc(uid).get();
    if (!targetDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Target user not found.');
    }
    if (targetDoc.data()?.role === 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Admin accounts cannot be deleted through this panel.'
      );
    }

    try {
      // 6. Delete from Firebase Auth first, then Firestore
      await admin.auth().deleteUser(uid);
      await db.collection('users').doc(uid).delete();

      return { success: true, message: 'User deleted successfully.' };
    } catch (error: any) {
      console.error('Delete user error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred. Please try again.'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// approveSubmission — Admin approves a pending file submission.
// Moves the document from pending_submissions to submissions.
// The file stays in Cloud Storage at the same path (no move needed).
// ---------------------------------------------------------------------------

export const approveSubmission = functions.https.onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    // 1. Authentication check
    if (!request.auth || !request.auth.token) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    // 2. Authorization check — caller must be an admin
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can approve submissions.');
    }

    // 3. Input validation
    const { submissionId } = request.data;
    validateApplicationId(submissionId);

    // 4. Fetch and lock the pending submission via Transaction
    const pendingRef = db.collection('pending_submissions').doc(submissionId);
    let submissionData: any;

    try {
      submissionData = await db.runTransaction(async (transaction) => {
        const pendingDoc = await transaction.get(pendingRef);

        if (!pendingDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'Submission not found or already processed.');
        }

        const data = pendingDoc.data();
        if (!data) {
          throw new functions.https.HttpsError('internal', 'Invalid submission data.');
        }

        // Create approved submission document within transaction
        const approvedRef = db.collection('submissions').doc(submissionId);
        transaction.set(approvedRef, {
          ...data,
          status: 'approved',
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvedBy: request.auth?.uid,
        });

        // Delete the pending document within transaction
        transaction.delete(pendingRef);

        return data;
      });
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('Transaction error:', error);
      throw new functions.https.HttpsError('internal', 'Failed to acquire submission lock.');
    }

    try {
      // 7. File stays in Cloud Storage — no move needed.
      //    The fileStoragePath in the submissions doc points to the same location.

      // 8. Send approval email via Brevo
      if (submissionData?.fullName && submissionData?.userId) {
        const userDoc = await db.collection('users').doc(submissionData.userId).get();
        const userEmail = userDoc.data()?.email;

        if (userEmail) {
          const safeName = escapeHtml(submissionData.fullName ?? 'SK Official');
          const safeDocLabel = escapeHtml(submissionData.documentLabel ?? 'Document');
          const safePeriod = escapeHtml(submissionData.period ?? '');

          await sendEmailViaBrevo(
            userEmail,
            safeName,
            `Submission Approved — ${submissionData.documentLabel ?? 'Document'}`,
            `<h1>Submission Approved</h1>
             <p>Dear ${safeName},</p>
             <p>Great news! Your submission for <strong>${safeDocLabel}</strong>${safePeriod ? ` (${safePeriod})` : ''} has been reviewed and <strong>approved</strong>.</p>
             <p>Thank you for ensuring timely compliance. You can view your updated records on the LYDO Compliance System dashboard.</p>`
          );
        }
      }

      return { success: true, message: 'Submission approved successfully.' };
    } catch (error: any) {
      console.error('Approve submission error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred. Please try again.'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// denySubmission — Admin denies a pending file submission.
// Deletes the document from pending_submissions and the file from Storage.
// Sends a denial notification email via Brevo.
// ---------------------------------------------------------------------------

export const denySubmission = functions.https.onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    // 1. Authentication check
    if (!request.auth || !request.auth.token) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    // 2. Authorization check — caller must be an admin
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can deny submissions.');
    }

    // 3. Input validation
    const { submissionId, reason } = request.data;
    validateApplicationId(submissionId);
    validateReason(reason);

    // 4. Fetch and lock the pending submission via Transaction
    const pendingRef = db.collection('pending_submissions').doc(submissionId);
    let submissionData: any;

    try {
      submissionData = await db.runTransaction(async (transaction) => {
        const pendingDoc = await transaction.get(pendingRef);

        if (!pendingDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'Submission not found or already processed.');
        }

        const data = pendingDoc.data();
        if (!data) {
          throw new functions.https.HttpsError('internal', 'Invalid submission data.');
        }

        // Move the document to the submissions collection with denied status within transaction
        const deniedRef = db.collection('submissions').doc(submissionId);
        transaction.set(deniedRef, {
          ...data,
          status: 'denied',
          fileStoragePath: null,
          fileUrl: null,
          deniedAt: admin.firestore.FieldValue.serverTimestamp(),
          deniedBy: request.auth?.uid,
          reviewNotes: reason,
        });

        // Delete the pending document within transaction
        transaction.delete(pendingRef);

        return data;
      });
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('Transaction error:', error);
      throw new functions.https.HttpsError('internal', 'Failed to acquire submission lock.');
    }

    try {
      // 5. Safe delete the file from Cloud Storage (path-traversal protected)
      await safeDeleteStorageFile(submissionData?.fileStoragePath);

      // 6. Send denial email via Brevo — escape all user-supplied values
      if (submissionData?.fullName && submissionData?.userId) {
        // Fetch submitter's email from users collection
        const userDoc = await db.collection('users').doc(submissionData.userId).get();
        const userEmail = userDoc.data()?.email;

        if (userEmail) {
          const safeName = escapeHtml(submissionData.fullName ?? 'SK Official');
          const safeDocLabel = escapeHtml(submissionData.documentLabel ?? 'Document');
          const safePeriod = escapeHtml(submissionData.period ?? '');
          const safeReason = escapeHtml(reason);

          await sendEmailViaBrevo(
            userEmail,
            safeName,
            `Submission Denied — ${submissionData.documentLabel ?? 'Document'}`,
            `<h1>Submission Denied</h1>
             <p>Dear ${safeName},</p>
             <p>Your submission for <strong>${safeDocLabel}</strong>${safePeriod ? ` (${safePeriod})` : ''} has been denied.</p>
             <p><strong>Reason:</strong> ${safeReason}</p>
             <p>Please review the feedback and submit a corrected document through the LYDO Compliance System.</p>`
          );
        }
      }

      return { success: true, message: 'Submission denied and notification sent.' };
    } catch (error: any) {
      console.error('Deny submission error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred. Please try again.'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// onSubmissionCreated — Triggered when a user creates a pending submission.
// Sends an email receipt to the user.
// ---------------------------------------------------------------------------

export const onSubmissionCreated = onDocumentCreated('pending_submissions/{submissionId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const submissionData = snapshot.data();

  if (submissionData?.fullName && submissionData?.userId) {
    const userDoc = await db.collection('users').doc(submissionData.userId).get();
    const userEmail = userDoc.data()?.email;

    if (userEmail) {
      const safeName = escapeHtml(submissionData.fullName ?? 'SK Official');
      const safeDocLabel = escapeHtml(submissionData.documentLabel ?? 'Document');
      const safePeriod = escapeHtml(submissionData.period ?? '');

      await sendEmailViaBrevo(
        userEmail,
        safeName,
        `Submission Received — ${submissionData.documentLabel ?? 'Document'}`,
        `<h1>Submission Received</h1>
         <p>Dear ${safeName},</p>
         <p>This is to confirm that we have successfully received your submission for <strong>${safeDocLabel}</strong>${safePeriod ? ` (${safePeriod})` : ''}.</p>
         <p>Your document is now <strong>Pending Review</strong> by the administration. You will receive another email once it has been processed.</p>
         <p>Thank you.</p>`
      );
    }
  }
});
