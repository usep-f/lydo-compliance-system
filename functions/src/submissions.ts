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
import { renderEmailLayout } from './emailTemplates';
import { writeNotification, writeNotificationToAdmins } from './notifications';
import { verifyPdfBuffer } from './pdfScreening';
import { recomputePublicAnalytics } from './analytics';
import { DENIAL_CATEGORIES, DenialCategory } from './constants/submissionTypes';

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

          const approvalEmailHtml = renderEmailLayout({
            headerSubtitle: 'Compliance Review Notification',
            recipientName: safeName,
            bodyHtml: `
              <p>Great news! Your compliance submission for <strong>${safeDocLabel}</strong>${safePeriod ? ` (${safePeriod})` : ''} has been formally evaluated and <strong>approved</strong>.</p>
              <p>Your barangay's compliance records and analytics have been updated accordingly in the system dashboard.</p>
              <p style="font-size: 13px; color: #64748b; margin-top: 14px;">Thank you for maintaining timely compliance with municipal governance reporting standards.</p>
            `,
            detailsTable: [
              { label: 'Document Type', value: safeDocLabel },
              ...(safePeriod ? [{ label: 'Period', value: safePeriod }] : []),
              { label: 'Review Status', value: 'Approved' },
            ],
            alertBox: {
              variant: 'success',
              title: 'Submission Approved',
              message: `The report for <strong>${safeDocLabel}</strong> meets all verification standards.`,
            },
          });

          await sendEmailViaBrevo(
            userEmail,
            safeName,
            `Submission Approved — ${submissionData.documentLabel ?? 'Document'}`,
            approvalEmailHtml
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

      await recomputePublicAnalytics(db);

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
    const { submissionId, reason, category } = request.data;
    validateApplicationId(submissionId);
    validateReason(reason);

    const safeCategory: DenialCategory = DENIAL_CATEGORIES.includes(category as DenialCategory)
      ? (category as DenialCategory)
      : 'Other / Specific Discrepancy';

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
          denialCategory: safeCategory,
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
          const safeCategoryLabel = escapeHtml(safeCategory);

          const denialEmailHtml = renderEmailLayout({
            headerSubtitle: 'Compliance Review Notification',
            recipientName: safeName,
            bodyHtml: `
              <p>Following evaluation by the LYDO administration, your submission for <strong>${safeDocLabel}</strong>${safePeriod ? ` (${safePeriod})` : ''} was <strong>denied</strong> due to discrepancies.</p>
              <p>Please review the administrative remarks below, make the necessary corrections to your document, and re-upload the corrected PDF through the portal dashboard.</p>
            `,
            detailsTable: [
              { label: 'Document Type', value: safeDocLabel },
              ...(safePeriod ? [{ label: 'Period', value: safePeriod }] : []),
              { label: 'Discrepancy Type', value: safeCategoryLabel },
            ],
            alertBox: {
              variant: 'danger',
              title: `Denial Remarks (${safeCategoryLabel})`,
              message: safeReason,
            },
          });

          await sendEmailViaBrevo(
            userEmail,
            safeName,
            `Submission Denied — ${submissionData.documentLabel ?? 'Document'}`,
            denialEmailHtml
          );
        }

        // 7. Write in-app notification to the submitting user
        const docLabel = submissionData.documentLabel ?? 'Document';
        const period = submissionData.period ?? '';
        await writeNotification(submissionData.userId, {
          type: 'submission_denied',
          title: 'Submission Denied',
          body: `Your ${docLabel}${period ? ` (${period})` : ''} submission was denied for "${safeCategory}". Remarks: ${reason}`,
          metadata: {
            submissionId: request.data.submissionId,
            documentLabel: docLabel,
            period,
            category: safeCategory,
            reason,
          },
        });
      }

      await recomputePublicAnalytics(db);

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
  if (!submissionData) return;

  const submissionId = event.params.submissionId;
  const { fileStoragePath, pageCount, userId, fullName, barangay, documentLabel, period } = submissionData;

  if (!fileStoragePath || !userId || !fullName) {
    console.error('onSubmissionCreated: Missing required fields in document data.');
    return;
  }

  // 1. Perform Server-Side PDF verification
  let verificationError = '';
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(fileStoragePath);
    const [exists] = await file.exists();

    if (!exists) {
      verificationError = 'File does not exist in storage.';
    } else {
      const [buffer] = await file.download();
      const verification = await verifyPdfBuffer(buffer, Number(pageCount || 0));
      if (!verification.isValid) {
        verificationError = verification.error || 'Invalid PDF structure.';
      }
    }
  } catch (err: any) {
    console.error('PDF validation exception:', err);
    verificationError = `Failed to process or parse document: ${err.message || 'Unknown error'}`;
  }

  const userDoc = await db.collection('users').doc(userId).get();
  const userEmail = userDoc.data()?.email;

  // 2. Handle Rejection Flow
  if (verificationError) {
    console.warn(`Auto-rejecting submission ${submissionId}: ${verificationError}`);

    // A. Delete file from Storage
    await safeDeleteStorageFile(fileStoragePath);

    // B. Delete pending submission document
    await snapshot.ref.delete();

    // C. Write denied entry in 'submissions' collection
    await db.collection('submissions').doc(submissionId).set({
      ...submissionData,
      status: 'denied',
      fileStoragePath: null,
      fileUrl: null,
      deniedAt: admin.firestore.FieldValue.serverTimestamp(),
      deniedBy: 'system',
      reviewNotes: `System Auto-Rejection: ${verificationError}`,
    });

    // D. Notify User via Brevo Email
    if (userEmail) {
      const safeName = escapeHtml(fullName ?? 'SK Official');
      const safeDocLabel = escapeHtml(documentLabel ?? 'Document');
      const safePeriod = escapeHtml(period ?? '');
      const safeReason = escapeHtml(verificationError);

      const autoRejectHtml = renderEmailLayout({
        headerSubtitle: 'Automated Document Verification',
        recipientName: safeName,
        bodyHtml: `
          <p>Your submission for <strong>${safeDocLabel}</strong>${safePeriod ? ` (${safePeriod})` : ''} could not be processed and has been <strong>automatically rejected</strong> by the system screening engine.</p>
          <p>Please inspect your source document, verify that it is an intact, uncorrupted PDF file that conforms to page specifications, and re-upload through the portal.</p>
        `,
        alertBox: {
          variant: 'danger',
          title: 'Automated Screening Error',
          message: safeReason,
        },
      });

      await sendEmailViaBrevo(
        userEmail,
        safeName,
        `Submission Rejected — ${documentLabel ?? 'Document'}`,
        autoRejectHtml
      );
    }

    // E. Write in-app notification to user
    const docLabel = documentLabel ?? 'Document';
    const cleanPeriod = period ?? '';
    await writeNotification(userId, {
      type: 'submission_denied',
      title: 'Submission Rejected ❌',
      body: `Your ${docLabel}${cleanPeriod ? ` (${cleanPeriod})` : ''} submission failed file verification and was auto-rejected.`,
      metadata: {
        submissionId,
        documentLabel: docLabel,
        period: cleanPeriod,
        reason: `Auto-Rejection: ${verificationError}`,
      },
    });

    return;
  }

  // 3. Normal Flow (Verification Passed)
  if (userEmail) {
    const safeName = escapeHtml(fullName ?? 'SK Official');
    const safeDocLabel = escapeHtml(documentLabel ?? 'Document');
    const safePeriod = escapeHtml(period ?? '');

    const receiptHtml = renderEmailLayout({
      headerSubtitle: 'Document Submission Receipt',
      recipientName: safeName,
      bodyHtml: `
        <p>This automated receipt confirms that your compliance report for <strong>${safeDocLabel}</strong>${safePeriod ? ` (${safePeriod})` : ''} has been successfully uploaded and screened.</p>
        <p>Your document has entered the <strong>Pending Review</strong> queue and is awaiting evaluation by LYDO administrators. You will receive an email update once your submission has been reviewed.</p>
      `,
      detailsTable: [
        { label: 'Document Type', value: safeDocLabel },
        ...(safePeriod ? [{ label: 'Reporting Period', value: safePeriod }] : []),
        { label: 'Queue Status', value: 'Pending Review' },
      ],
      alertBox: {
        variant: 'info',
        title: 'Submission Queued',
        message: 'Your upload passed file integrity verification and is safely recorded.',
      },
    });

    await sendEmailViaBrevo(
      userEmail,
      safeName,
      `Submission Received — ${documentLabel ?? 'Document'}`,
      receiptHtml
    );
  }

  // Write in-app notification to the submitting user
  const docLabel = documentLabel ?? 'Document';
  const cleanPeriod = period ?? '';
  await writeNotification(userId, {
    type: 'submission_received',
    title: 'Submission Received',
    body: `Your ${docLabel}${cleanPeriod ? ` (${cleanPeriod})` : ''} submission is now pending review.`,
    metadata: {
      submissionId,
      documentLabel: docLabel,
      period: cleanPeriod,
      barangay: barangay ?? '',
    },
  });

  // Write in-app notification to all admin users
  await writeNotificationToAdmins({
    type: 'new_submission',
    title: 'New Submission',
    body: `${fullName} (${barangay ?? 'Unknown'}) submitted ${docLabel}.`,
    metadata: {
      submissionId,
      documentLabel: docLabel,
      period: cleanPeriod,
      barangay: barangay ?? '',
      applicantName: fullName ?? '',
    },
  });

  await recomputePublicAnalytics(db);
});

