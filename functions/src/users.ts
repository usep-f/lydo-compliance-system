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
// checkEmailAvailability
// ---------------------------------------------------------------------------
export const checkEmailAvailability = functions.https.onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 15,
    memory: '256MiB',
  },
  async (request) => {
    const db = admin.firestore();
    const { email } = request.data;
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new functions.https.HttpsError('invalid-argument', 'A valid email address is required.');
    }
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if the email exists in Firebase Auth (already a registered user)
    try {
      await admin.auth().getUserByEmail(cleanEmail);
      return { available: false, reason: 'registered' };
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        console.error('Error fetching user from Auth:', error);
        throw new functions.https.HttpsError('internal', 'Internal error validating email.');
      }
    }

    // 2. Check if a pending registration already exists in the pending_users collection
    const docId = cleanEmail.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const pendingRef = db.collection('pending_users').doc(docId);
    
    try {
      const pendingDoc = await pendingRef.get();
      if (pendingDoc.exists) {
        return { available: false, reason: 'pending' };
      }
    } catch (error: any) {
      console.error('Error fetching pending user doc:', error);
      throw new functions.https.HttpsError('internal', 'Internal error validating email.');
    }

    // 3. Extra safety check: query both pending_users and users collections in case of mismatched IDs
    try {
      const pendingQuery = await db.collection('pending_users').where('email', '==', cleanEmail).limit(1).get();
      if (!pendingQuery.empty) {
        return { available: false, reason: 'pending' };
      }

      const userQuery = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!userQuery.empty) {
        return { available: false, reason: 'registered' };
      }
    } catch (error: any) {
      console.error('Error querying email in Firestore collections:', error);
      throw new functions.https.HttpsError('internal', 'Internal error validating email.');
    }

    return { available: true };
  }
);

// ---------------------------------------------------------------------------
// approveUser
// ---------------------------------------------------------------------------
export const approveUser = functions.https.onCall(
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
      throw new functions.https.HttpsError('permission-denied', 'Only admins can approve users.');
    }

    // 3. Input validation
    const { applicationId } = request.data;
    validateApplicationId(applicationId);

    // 3.5 Pre-validate that the email does not already exist in Firebase Auth
    const pendingRef = db.collection('pending_users').doc(applicationId);
    const pendingDocSnapshot = await pendingRef.get();
    
    if (!pendingDocSnapshot.exists) {
      throw new functions.https.HttpsError('not-found', 'Application not found or already processed.');
    }
    
    const applicantEmail = pendingDocSnapshot.data()?.email;
    if (applicantEmail) {
      try {
        await admin.auth().getUserByEmail(applicantEmail.trim().toLowerCase());
        throw new functions.https.HttpsError(
          'already-exists',
          'A user with this email address is already registered in the system.'
        );
      } catch (authError: any) {
        if (authError.code !== 'auth/user-not-found') {
          console.error('Auth email existence check error:', authError);
          if (authError instanceof functions.https.HttpsError) {
            throw authError;
          }
          throw new functions.https.HttpsError(
            'internal',
            'An error occurred verifying email uniqueness.'
          );
        }
      }
    }

    // 4. Fetch and lock the pending application via Transaction
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

      // 11. Write in-app notification to the newly created user
      await writeNotification(userRecord.uid, {
        type: 'account_approved',
        title: 'Account Approved 🎉',
        body: 'Your SK Official account has been approved. Welcome to the LYDO Compliance System!',
      });

      return { success: true, message: 'User approved and email sent.' };
    } catch (error: any) {
      console.error('Approval error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred. Please try again.'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// denyUser
// ---------------------------------------------------------------------------
export const denyUser = functions.https.onCall(
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
      console.error('Denial error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred. Please try again.'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// updateUser
// ---------------------------------------------------------------------------
export const updateUser = functions.https.onCall(
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

      // 9. Write in-app notification to the updated user
      await writeNotification(uid, {
        type: 'profile_updated',
        title: 'Profile Updated',
        body: 'Your account details were updated by the administrator.',
      });

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
// deleteUser
// ---------------------------------------------------------------------------
export const deleteUser = functions.https.onCall(
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
// updateOwnProfile
// ---------------------------------------------------------------------------
export const updateOwnProfile = functions.https.onCall(
  {
    maxInstances: 10,
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (request) => {
    const db = admin.firestore();

    if (!request.auth || !request.auth.token) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const uid = request.auth.uid;
    const { email, fullName, passwordChanged } = request.data;

    // Validate email
    if (email !== undefined && email !== null) {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new functions.https.HttpsError('invalid-argument', 'A valid email address is required.');
      }
    }
    // Validate fullName
    if (fullName !== undefined && fullName !== null) {
      if (typeof fullName !== 'string' || fullName.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Full name must be a non-empty string.');
      }
    }

    try {
      // 1. Update the 'users' document
      const userDocRef = db.collection('users').doc(uid);
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found.');
      }
      
      const updateData: any = {};
      if (email) updateData.email = email.trim();
      if (fullName) updateData.fullName = fullName.trim();

      if (Object.keys(updateData).length > 0) {
        await userDocRef.update(updateData);
      }

      // 2. If fullName changed, update it across denormalized collections
      if (fullName) {
        let opsCount = 0;
        let batch = db.batch();
        
        const commitBatchIfNeeded = async () => {
          if (opsCount >= 490) {
            await batch.commit();
            batch = db.batch();
            opsCount = 0;
          }
        };

        const collections = ['pending_submissions', 'submissions', 'perennial_counts'];
        
        for (const collName of collections) {
          const snapshot = await db.collection(collName).where('userId', '==', uid).get();
          for (const doc of snapshot.docs) {
            batch.update(doc.ref, { fullName: fullName.trim() });
            opsCount++;
            await commitBatchIfNeeded();
          }
        }
        
        if (opsCount > 0) {
          await batch.commit();
        }
      }

      // 3. Notify Admins
      let changes: string[] = [];
      if (fullName) changes.push('Name');
      if (email) changes.push('Email');
      if (passwordChanged) changes.push('Password');
      
      if (changes.length > 0) {
        const safeName = fullName || userDoc.data()?.fullName || 'A user';
        await writeNotificationToAdmins({
          type: 'profile_updated',
          title: 'User Profile Updated',
          body: `${safeName} changed their: ${changes.join(', ')}.`,
          metadata: {
            applicantName: safeName,
            barangay: userDoc.data()?.barangay ?? '',
          },
        });

        // 4. Notify User via Brevo Email
        const targetEmail = email || userDoc.data()?.email;
        if (targetEmail) {
          const changeListHtml = changes.map(c => `<li>${escapeHtml(c)}</li>`).join('');
          await sendEmailViaBrevo(
            targetEmail,
            escapeHtml(safeName),
            'Your Profile Has Been Updated',
            `<h1>Profile Update Alert</h1>
             <p>Dear ${escapeHtml(safeName)},</p>
             <p>Your LYDO Compliance System account profile was recently updated. The following information was changed:</p>
             <ul>
               ${changeListHtml}
             </ul>
             <p>If you did not make these changes, please contact the administrator immediately.</p>`
          );
        }
      }

      return { success: true, message: 'Profile updated successfully.' };
    } catch (error: any) {
      console.error('updateOwnProfile error:', error);
      throw new functions.https.HttpsError('internal', 'Failed to update profile.');
    }
  }
);

// ---------------------------------------------------------------------------
// deleteOwnAccount
// ---------------------------------------------------------------------------
export const deleteOwnAccount = functions.https.onCall(
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

    const uid = request.auth.uid;

    try {
      // 1. Fetch user to get details for admin notification
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found.');
      }
      
      const userData = userDoc.data();
      if (userData?.role === 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admins cannot delete their own accounts through this endpoint.');
      }

      const safeName = userData?.fullName || 'A user';
      const barangay = userData?.barangay || 'Unknown';

      // 2. Delete from Firebase Auth first
      await admin.auth().deleteUser(uid);

      // 3. Delete from Firestore users collection
      await db.collection('users').doc(uid).delete();

      // 4. Notify Admins (In-App)
      await writeNotificationToAdmins({
        type: 'user_deleted',
        title: 'Account Deleted',
        body: `${safeName} (${barangay}) has permanently deleted their account. Their submissions have been retained for auditing.`,
        metadata: {
          applicantName: safeName,
          barangay: barangay,
        },
      });

      // 5. Notify the User via Brevo Email
      const userEmail = request.auth.token.email || userData?.email;
      if (userEmail) {
        await sendEmailViaBrevo(
          userEmail,
          escapeHtml(safeName),
          'Account Successfully Deleted',
          `<h1>Account Deletion Confirmed</h1>
           <p>Dear ${escapeHtml(safeName)},</p>
           <p>Your LYDO Compliance System account has been permanently deleted as requested.</p>
           <p>Please note that for administrative auditing and compliance purposes, any past submissions you made will be retained in our records.</p>
           <p>Thank you for using our system.</p>`
        );
      }

      // 6. Notify Admins via Brevo Email
      const adminSnapshot = await db.collection('users').where('role', '==', 'admin').get();
      const adminEmails: string[] = [];
      adminSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.email) adminEmails.push(data.email);
      });

      await Promise.allSettled(
        adminEmails.map(adminEmail => 
          sendEmailViaBrevo(
            adminEmail,
            'Admin',
            `User Account Deleted - ${safeName}`,
            `<h1>User Account Deleted</h1>
             <p>A user account has been permanently deleted from the LYDO Compliance System.</p>
             <p><strong>Name:</strong> ${escapeHtml(safeName)}</p>
             <p><strong>Barangay:</strong> ${escapeHtml(barangay)}</p>
             <p>Their historical submissions and uploaded files have been retained in the system for auditing purposes.</p>`
          )
        )
      );

      return { success: true, message: 'Account deleted successfully.' };
    } catch (error: any) {
      console.error('deleteOwnAccount error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'An error occurred while deleting your account.'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// onApplicationCreated (Document trigger)
// ---------------------------------------------------------------------------
export const onApplicationCreated = onDocumentCreated('pending_users/{applicationId}', async (event) => {
  const db = admin.firestore();
  const snapshot = event.data;
  if (!snapshot) return;

  const applicantData = snapshot.data();
  if (!applicantData) return;

  const fullName = applicantData.fullName ?? 'Unknown Applicant';
  const barangay = applicantData.barangay ?? 'Unknown Barangay';

  await writeNotificationToAdmins({
    type: 'new_application',
    title: 'New Application',
    body: `${fullName} from ${barangay} submitted a registration application.`,
    metadata: {
      applicantName: fullName,
      barangay,
    },
  });

  // Notify Admins via Brevo Email
  try {
    const adminSnapshot = await db.collection('users').where('role', '==', 'admin').get();
    const adminEmails: string[] = [];
    adminSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email) adminEmails.push(data.email);
    });

    await Promise.allSettled(
      adminEmails.map(adminEmail => 
        sendEmailViaBrevo(
          adminEmail,
          'Admin',
          'New Registration Application',
          `<h1>New Registration Application</h1>
           <p>A new user has submitted a registration application and is awaiting your review.</p>
           <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
           <p><strong>Barangay:</strong> ${escapeHtml(barangay)}</p>
           <p>Please log in to the admin dashboard to review and approve their account.</p>`
        )
      )
    );
  } catch (err) {
    console.error('Failed to send admin email for new application:', err);
  }
});
