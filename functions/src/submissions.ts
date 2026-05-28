/* eslint-disable @typescript-eslint/no-explicit-any */
import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { 
  validateApplicationId, 
  validateReason, 
  sendEmailViaBrevo, 
  safeDeleteStorageFile, 
  escapeHtml 
} from './helpers';
import { writeNotification, writeNotificationToAdmins } from './notifications';

// ---------------------------------------------------------------------------
// approveSubmission
// ---------------------------------------------------------------------------
export const approveSubmission = functions.https.onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    const db = admin.firestore();

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

        // 9. Write in-app notification to the submitting user
        const docLabel = submissionData.documentLabel ?? 'Document';
        const period = submissionData.period ?? '';
        await writeNotification(submissionData.userId, {
          type: 'submission_approved',
          title: 'Submission Approved ✅',
          body: `Your ${docLabel}${period ? ` (${period})` : ''} submission has been approved.`,
          metadata: {
            submissionId: request.data.submissionId,
            documentLabel: docLabel,
            period,
          },
        });
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
// denySubmission
// ---------------------------------------------------------------------------
export const denySubmission = functions.https.onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    const db = admin.firestore();

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

        // 7. Write in-app notification to the submitting user
        const docLabel = submissionData.documentLabel ?? 'Document';
        const period = submissionData.period ?? '';
        await writeNotification(submissionData.userId, {
          type: 'submission_denied',
          title: 'Submission Denied',
          body: `Your ${docLabel}${period ? ` (${period})` : ''} submission was denied. Reason: ${reason}`,
          metadata: {
            submissionId: request.data.submissionId,
            documentLabel: docLabel,
            period,
            reason,
          },
        });
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
// onSubmissionCreated
// ---------------------------------------------------------------------------
export const onSubmissionCreated = onDocumentCreated('pending_submissions/{submissionId}', async (event) => {
  const db = admin.firestore();
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

    // Write in-app notification to the submitting user
    const docLabel = submissionData.documentLabel ?? 'Document';
    const period = submissionData.period ?? '';
    await writeNotification(submissionData.userId, {
      type: 'submission_received',
      title: 'Submission Received',
      body: `Your ${docLabel}${period ? ` (${period})` : ''} submission is now pending review.`,
      metadata: {
        submissionId: event.params.submissionId,
        documentLabel: docLabel,
        period,
        barangay: submissionData.barangay ?? '',
      },
    });

    // Write in-app notification to all admin users
    await writeNotificationToAdmins({
      type: 'new_submission',
      title: 'New Submission',
      body: `${submissionData.fullName} (${submissionData.barangay ?? 'Unknown'}) submitted ${docLabel}.`,
      metadata: {
        submissionId: event.params.submissionId,
        documentLabel: docLabel,
        period,
        barangay: submissionData.barangay ?? '',
        applicantName: submissionData.fullName ?? '',
      },
    });
  }
});
