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
import { writeNotificationToAdmins } from './notifications';

// ---------------------------------------------------------------------------
// verifyAndScheduleAccreditation
// ---------------------------------------------------------------------------
export const verifyAndScheduleAccreditation = functions.https.onCall(
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
      throw new functions.https.HttpsError('permission-denied', 'Only admins can verify accreditations.');
    }

    const { applicationId, schedule } = request.data;
    validateApplicationId(applicationId);

    if (!schedule || typeof schedule !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'Valid schedule details are required.');
    }

    const { date, time, venue, instructions } = schedule;
    if (!date || typeof date !== 'string' || !time || typeof time !== 'string' || !venue || typeof venue !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Date, time, and venue are required strings.');
    }

    const appRef = db.collection('accreditation_applications').doc(applicationId);

    let appData: any = null;

    // 3. Concurrency-safe Firestore Transaction
    await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(appRef);
      if (!docSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Accreditation application not found.');
      }

      appData = docSnap.data();

      transaction.update(appRef, {
        status: 'verified',
        deliberationSchedule: {
          date: date.trim(),
          time: time.trim(),
          venue: venue.trim(),
          instructions: typeof instructions === 'string' ? instructions.trim() : '',
          scheduledBy: request.auth?.uid || 'admin',
          scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // 4. Send official deliberation invitation email via Brevo
    if (appData && appData.contactEmail) {
      const orgNameSafe = escapeHtml(appData.orgName || 'Youth Organization');
      const contactPersonSafe = escapeHtml(appData.contactPerson || 'Representative');
      const dateSafe = escapeHtml(date);
      const timeSafe = escapeHtml(time);
      const venueSafe = escapeHtml(venue);
      const instructionsSafe = escapeHtml(instructions || 'Please bring 1 set of original signed hard copies of the 5 submitted PDF documents.');

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #001b2e 0%, #003b6d 100%); color: #ffffff; padding: 28px 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">LOCAL YOUTH DEVELOPMENT OFFICE</h2>
            <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px;">Youth Organization Accreditation Program (YORP)</p>
          </div>
          
          <div style="padding: 28px 24px;">
            <p style="font-size: 15px; margin-top: 0;">Dear <strong>${contactPersonSafe}</strong>,</p>
            <p style="font-size: 14px;">
              We are pleased to inform you that the accreditation documents submitted on behalf of <strong>${orgNameSafe}</strong> have been <strong>verified and approved for deliberation</strong>.
            </p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px; padding: 18px 20px; margin: 24px 0;">
              <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #166534;">Official Deliberation &amp; Orientation Call-in Schedule</h3>
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #475569; width: 30%;"><strong>Date:</strong></td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${dateSafe}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #475569;"><strong>Time:</strong></td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${timeSafe}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #475569;"><strong>Venue:</strong></td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${venueSafe}</td>
                </tr>
              </table>
              <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #bbf7d0; font-size: 13px; color: #166534;">
                <strong>Special Instructions:</strong><br/>
                ${instructionsSafe}
              </div>
            </div>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #0f172a;">What to Bring on Deliberation Day:</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
                <li>Printed, original signed copy of your <strong>Letter of Intent</strong></li>
                <li>Printed, accomplished <strong>Application Form</strong></li>
                <li>Printed <strong>Directory of Officers</strong> with valid IDs</li>
                <li>Printed <strong>Roster of Members</strong></li>
                <li>Official copy of your <strong>Constitution &amp; By-Laws (CBL)</strong></li>
              </ul>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
              If you have any questions or need to reschedule, please visit the Local Youth Development Office during regular government business hours.
            </p>
          </div>

          <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            This is an automated notification from the Local Youth Development Office (LYDO) Compliance System.
          </div>
        </div>
      `;

      await sendEmailViaBrevo(
        appData.contactEmail,
        appData.contactPerson || appData.orgName,
        `[LYDO] Youth Org Accreditation Verified & Deliberation Schedule - ${appData.orgName}`,
        emailHtml
      );
    }

    return { success: true, message: 'Accreditation verified and invitation email dispatched.' };
  }
);

// ---------------------------------------------------------------------------
// requestAccreditationRevision
// ---------------------------------------------------------------------------
export const requestAccreditationRevision = functions.https.onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    const db = admin.firestore();

    if (!request.auth || !request.auth.token) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can request revisions.');
    }

    const { applicationId, flaggedDocs, remarks } = request.data;
    validateApplicationId(applicationId);
    validateReason(remarks);

    const appRef = db.collection('accreditation_applications').doc(applicationId);
    let appData: any = null;

    await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(appRef);
      if (!docSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Accreditation application not found.');
      }

      appData = docSnap.data();

      transaction.update(appRef, {
        status: 'revision_requested',
        flaggedDocs: Array.isArray(flaggedDocs) ? flaggedDocs : [],
        revisionRemarks: remarks.trim(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    if (appData && appData.contactEmail) {
      const orgNameSafe = escapeHtml(appData.orgName || 'Youth Organization');
      const remarksSafe = escapeHtml(remarks);

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #001b2e; color: #ffffff; padding: 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">LOCAL YOUTH DEVELOPMENT OFFICE</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.8;">Accreditation Document Revision Required</p>
          </div>
          
          <div style="padding: 24px;">
            <p style="margin-top: 0;">Dear <strong>${escapeHtml(appData.contactPerson || 'Representative')}</strong>,</p>
            <p>
              Your accreditation application for <strong>${orgNameSafe}</strong> has been reviewed by the LYDO evaluation team. Before proceeding with official deliberation, revisions are required for your documents.
            </p>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 16px; margin: 20px 0;">
              <h4 style="margin: 0 0 8px 0; color: #1e40af;">Findings / Revision Instructions:</h4>
              <p style="margin: 0; color: #1e293b; font-size: 14px;">${remarksSafe}</p>
            </div>

            <p style="font-size: 13px; color: #64748b;">
              Please coordinate directly with the LYDO staff to submit the corrected documents.
            </p>
          </div>
        </div>
      `;

      await sendEmailViaBrevo(
        appData.contactEmail,
        appData.contactPerson || appData.orgName,
        `[LYDO] Revision Required: Accreditation Application - ${appData.orgName}`,
        emailHtml
      );
    }

    return { success: true, message: 'Revision request recorded and email sent.' };
  }
);

// ---------------------------------------------------------------------------
// disapproveAccreditation
// ---------------------------------------------------------------------------
export const disapproveAccreditation = functions.https.onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    const db = admin.firestore();

    if (!request.auth || !request.auth.token) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can disapprove applications.');
    }

    const { applicationId, reason } = request.data;
    validateApplicationId(applicationId);
    validateReason(reason);

    const appRef = db.collection('accreditation_applications').doc(applicationId);
    let appData: any = null;

    await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(appRef);
      if (!docSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Accreditation application not found.');
      }

      appData = docSnap.data();

      transaction.update(appRef, {
        status: 'disapproved',
        rejectionReason: reason.trim(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Safely delete uploaded PDF files
    if (appData && appData.documents && typeof appData.documents === 'object') {
      for (const key of Object.keys(appData.documents)) {
        const storagePath = appData.documents[key]?.storagePath;
        if (storagePath) {
          await safeDeleteStorageFile(storagePath);
        }
      }
    }

    // Send disapproval notification email
    if (appData && appData.contactEmail) {
      const orgNameSafe = escapeHtml(appData.orgName || 'Youth Organization');
      const reasonSafe = escapeHtml(reason);

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #001b2e; color: #ffffff; padding: 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">LOCAL YOUTH DEVELOPMENT OFFICE</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.8;">Accreditation Application Notice</p>
          </div>
          
          <div style="padding: 24px;">
            <p style="margin-top: 0;">Dear <strong>${escapeHtml(appData.contactPerson || 'Representative')}</strong>,</p>
            <p>
              We regret to inform you that your accreditation application for <strong>${orgNameSafe}</strong> has been disapproved following review.
            </p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 16px; margin: 20px 0;">
              <h4 style="margin: 0 0 8px 0; color: #991b1b;">Grounds for Disapproval:</h4>
              <p style="margin: 0; color: #1e293b; font-size: 14px;">${reasonSafe}</p>
            </div>

            <p style="font-size: 13px; color: #64748b;">
              For further clarification or to re-apply in future accreditation cycles, you may visit the Local Youth Development Office.
            </p>
          </div>
        </div>
      `;

      await sendEmailViaBrevo(
        appData.contactEmail,
        appData.contactPerson || appData.orgName,
        `[LYDO] Notice of Disapproval: Accreditation Application - ${appData.orgName}`,
        emailHtml
      );
    }

    return { success: true, message: 'Application marked as disapproved and files pruned.' };
  }
);

// ---------------------------------------------------------------------------
// onAccreditationCreated (Document trigger)
// ---------------------------------------------------------------------------
export const onAccreditationCreated = onDocumentCreated(
  'accreditation_applications/{applicationId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const appData = snapshot.data();
    if (!appData) return;

    const orgName = appData.orgName ?? 'Unknown Organization';
    const barangay = appData.barangay ?? 'Unknown Barangay';
    const applicationId = event.params.applicationId;

    await writeNotificationToAdmins({
      type: 'new_accreditation',
      title: 'New Youth Org Accreditation',
      body: `${orgName} (${barangay}) submitted accreditation requirements.`,
      metadata: {
        applicationId,
        orgName,
        barangay,
        classification: appData.classification ?? '',
        contactPerson: appData.contactPerson ?? '',
      },
    });
  }
);

