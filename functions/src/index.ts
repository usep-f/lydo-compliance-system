import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage().bucket();

/**
 * Sends a transactional email using Brevo's v3 SMTP API.
 * Uses native fetch (available in Node.js 18+) so no extra SDK is needed.
 */
async function sendEmailViaBrevo(toEmail: string, toName: string, subject: string, htmlContent: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    console.warn("Brevo credentials (BREVO_API_KEY or BREVO_SENDER_EMAIL) are not set in the environment. Skipping email.");
    return { success: false, error: "Credentials not set" };
  }

  try {
    console.log(`Sending email to ${toEmail} using Brevo...`);
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'Lydo Compliance',
          email: senderEmail
        },
        to: [
          {
            email: toEmail,
            name: toName
          }
        ],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Brevo API returned error status ${response.status}:`, errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    console.log("Brevo email sent successfully:", data);
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to send email via Brevo:", error);
    return { success: false, error: error.message };
  }
}

export const approveUser = functions.https.onCall(async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  // Verify Admin
  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can approve users.');
  }

  const { applicationId } = request.data;
  if (!applicationId) {
    throw new functions.https.HttpsError('invalid-argument', 'Application ID is required.');
  }

  const pendingRef = db.collection('pending_users').doc(applicationId);
  const pendingDoc = await pendingRef.get();

  if (!pendingDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Application not found.');
  }

  const applicantData = pendingDoc.data();
  if (!applicantData || !applicantData.email) {
    throw new functions.https.HttpsError('internal', 'Invalid application data.');
  }

  try {
    // 1. Create Auth User
    const userRecord = await admin.auth().createUser({
      email: applicantData.email,
      displayName: applicantData.fullName,
      emailVerified: true
    });

    // 2. Generate Password Reset Link
    const resetLink = await admin.auth().generatePasswordResetLink(applicantData.email);

    // 3. Move to Users Collection
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      fullName: applicantData.fullName,
      email: applicantData.email,
      barangay: applicantData.barangay,
      role: 'user',
      status: 'approved',
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 4. Delete Storage Proof File
    if (applicantData.proofStoragePath) {
      try {
        await storage.file(applicantData.proofStoragePath).delete();
      } catch (e) {
        console.error("Failed to delete storage file:", e);
      }
    }

    // 5. Delete Pending Document
    await pendingRef.delete();

    // 6. Send Email via Brevo
    await sendEmailViaBrevo(
      applicantData.email,
      applicantData.fullName,
      'Application Approved - Set Your Password',
      `<h1>Welcome to Lydo Compliance System</h1>
             <p>Your SK Official application has been approved.</p>
             <p>Please <a href="${resetLink}">click here to set your password</a>.</p>`
    );

    return { success: true, message: 'User approved and email sent.' };
  } catch (error: any) {
    console.error("Approval error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

export const denyUser = functions.https.onCall(async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  // Verify Admin
  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can deny users.');
  }

  const { applicationId, reason } = request.data;
  if (!applicationId || !reason) {
    throw new functions.https.HttpsError('invalid-argument', 'Application ID and reason are required.');
  }

  const pendingRef = db.collection('pending_users').doc(applicationId);
  const pendingDoc = await pendingRef.get();

  if (!pendingDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Application not found.');
  }

  const applicantData = pendingDoc.data();

  try {
    // 1. Delete Storage Proof File
    if (applicantData?.proofStoragePath) {
      try {
        await storage.file(applicantData.proofStoragePath).delete();
      } catch (e) {
        console.error("Failed to delete storage file:", e);
      }
    }

    // 2. Delete Pending Document
    await pendingRef.delete();

    // 3. Send Rejection Email via Brevo
    if (applicantData?.email) {
      await sendEmailViaBrevo(
        applicantData.email,
        applicantData.fullName || 'SK Official',
        'Application Denied - Lydo Compliance System',
        `<h1>Application Status Update</h1>
               <p>We regret to inform you that your application has been denied.</p>
               <p><strong>Reason:</strong> ${reason}</p>`
      );
    }

    return { success: true, message: 'User denied and email sent.' };
  } catch (error: any) {
    console.error("Denial error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
