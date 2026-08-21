import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { sendEmailViaBrevo } from './helpers';

// Helpers
function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString(); // 6 digits
}

function hashOTP(code: string, salt: string): string {
  return crypto.createHash('sha256').update(code + salt).digest('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  return `${name[0]}***@${domain}`;
}

// ---------------------------------------------------------------------------
// 1. initiateLogin
// ---------------------------------------------------------------------------
export const initiateLogin = functions.https.onCall(async (request) => {
  const { email, password, apiKey, deviceToken } = request.data;
  
  if (!email || !password || !apiKey) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing credentials or API key.');
  }
  
  // 1. Verify credentials against Firebase Identity Toolkit REST API
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const authRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  
  const authData = await authRes.json();
  if (!authRes.ok) {
    throw new functions.https.HttpsError('unauthenticated', authData.error?.message || 'Invalid credentials');
  }
  
  const uid = authData.localId;
  const db = admin.firestore();
  
  // 2. Fetch user profile to check 2FA status
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User profile not found.');
  }
  
  const userData = userDoc.data();
  const twoFactorEnabled = userData?.twoFactorEnabled === true;
  
  // 3. If 2FA is OFF, login immediately
  if (!twoFactorEnabled) {
    const customToken = await admin.auth().createCustomToken(uid);
    return { status: 'SUCCESS', customToken };
  }
  
  // 4. If 2FA is ON, check for trusted device
  if (deviceToken && Array.isArray(userData?.trustedDevices)) {
    const hashedDevice = crypto.createHash('sha256').update(deviceToken).digest('hex');
    const matchedDevice = userData.trustedDevices.find((d: { deviceHash: string; expiresAt: string }) => d.deviceHash === hashedDevice);
    if (matchedDevice && new Date(matchedDevice.expiresAt).getTime() > Date.now()) {
      const customToken = await admin.auth().createCustomToken(uid);
      return { status: 'SUCCESS', customToken, deviceTrusted: true };
    }
  }
  
  // 5. Generate and send 2FA Challenge
  const code = generateOTP();
  const salt = generateSalt();
  const hashedCode = hashOTP(code, salt);
  
  const challengeRef = db.collection('twoFactorChallenges').doc();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  await challengeRef.set({
    uid,
    email,
    hashedCode,
    salt,
    attemptsRemaining: 5,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
      <h2>LYDO Compliance System</h2>
      <p>Your login verification code is:</p>
      <h1 style="font-size: 32px; letter-spacing: 4px; color: #4F46E5;">${code}</h1>
      <p>This code is valid for 5 minutes. Never share this code with anyone.</p>
    </div>
  `;
  
  await sendEmailViaBrevo(email, userData?.fullName || 'User', 'Your Login Verification Code', htmlContent);
  
  return { status: 'MFA_REQUIRED', challengeId: challengeRef.id, maskedEmail: maskEmail(email) };
});

// ---------------------------------------------------------------------------
// 2. verifyTwoFactorLogin
// ---------------------------------------------------------------------------
export const verifyTwoFactorLogin = functions.https.onCall(async (request) => {
  const { challengeId, code, trustDevice, userAgent } = request.data;
  
  if (!challengeId || !code) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing challenge ID or code.');
  }
  
  const db = admin.firestore();
  const challengeRef = db.collection('twoFactorChallenges').doc(challengeId);
  const challengeDoc = await challengeRef.get();
  
  if (!challengeDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Verification code expired or not found. Please request a new one.');
  }
  
  const challenge = challengeDoc.data();
  if (!challenge) {
    throw new functions.https.HttpsError('internal', 'Invalid challenge data.');
  }
  
  // Check expiry
  if (challenge.expiresAt.toDate().getTime() < Date.now()) {
    await challengeRef.delete();
    throw new functions.https.HttpsError('deadline-exceeded', 'Verification code expired. Please request a new one.');
  }
  
  // Check attempts
  if (challenge.attemptsRemaining <= 0) {
    await challengeRef.delete();
    throw new functions.https.HttpsError('resource-exhausted', 'Too many failed attempts. Please sign in again.');
  }
  
  const inputHash = hashOTP(code, challenge.salt);
  if (inputHash !== challenge.hashedCode) {
    const attemptsLeft = challenge.attemptsRemaining - 1;
    if (attemptsLeft <= 0) {
      await challengeRef.delete();
      throw new functions.https.HttpsError('resource-exhausted', 'Too many failed attempts. Please sign in again.');
    } else {
      await challengeRef.update({ attemptsRemaining: attemptsLeft });
      throw new functions.https.HttpsError('permission-denied', `Incorrect code. ${attemptsLeft} attempts remaining.`);
    }
  }
  
  // Code is valid
  await challengeRef.delete();
  
  const customToken = await admin.auth().createCustomToken(challenge.uid);
  let newDeviceToken = null;
  
  if (trustDevice) {
    newDeviceToken = crypto.randomBytes(32).toString('hex');
    const deviceHash = crypto.createHash('sha256').update(newDeviceToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const userRef = db.collection('users').doc(challenge.uid);
    
    await db.runTransaction(async (t) => {
      const uDoc = await t.get(userRef);
      if (!uDoc.exists) return;
      
      let devices = uDoc.data()?.trustedDevices || [];
      // Clean up expired devices
      devices = devices.filter((d: { deviceHash: string; expiresAt: string }) => new Date(d.expiresAt).getTime() > Date.now());
      devices.push({
        deviceHash,
        userAgent: userAgent || 'Unknown browser',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      });
      // Keep only last 10 devices
      if (devices.length > 10) devices = devices.slice(-10);
      
      t.update(userRef, { trustedDevices: devices });
    });
  }
  
  return { status: 'SUCCESS', customToken, deviceToken: newDeviceToken };
});

// ---------------------------------------------------------------------------
// 3. requestTwoFactorEnrollment
// ---------------------------------------------------------------------------
export const requestTwoFactorEnrollment = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }
  
  const uid = request.auth.uid;
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(uid).get();
  
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found.');
  }
  
  const email = userDoc.data()?.email;
  const fullName = userDoc.data()?.fullName || 'User';
  
  const code = generateOTP();
  const salt = generateSalt();
  const hashedCode = hashOTP(code, salt);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  const challengeRef = db.collection('twoFactorChallenges').doc();
  await challengeRef.set({
    uid,
    email,
    hashedCode,
    salt,
    attemptsRemaining: 5,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
      <h2>LYDO Compliance System</h2>
      <p>Your verification code to <strong>enable Two-Factor Authentication</strong> is:</p>
      <h1 style="font-size: 32px; letter-spacing: 4px; color: #4F46E5;">${code}</h1>
      <p>This code is valid for 5 minutes.</p>
    </div>
  `;
  
  await sendEmailViaBrevo(email, fullName, 'Enable Two-Factor Authentication', htmlContent);
  
  return { challengeId: challengeRef.id, maskedEmail: maskEmail(email) };
});

// ---------------------------------------------------------------------------
// 4. confirmTwoFactorEnrollment
// ---------------------------------------------------------------------------
export const confirmTwoFactorEnrollment = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }
  
  const { challengeId, code } = request.data;
  const uid = request.auth.uid;
  const db = admin.firestore();
  
  const challengeRef = db.collection('twoFactorChallenges').doc(challengeId);
  
  const result = await db.runTransaction(async (t) => {
    const doc = await t.get(challengeRef);
    if (!doc.exists) {
      throw new functions.https.HttpsError('not-found', 'Verification code expired or not found.');
    }
    
    const challenge = doc.data()!;
    if (challenge.uid !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid challenge.');
    }
    
    if (challenge.expiresAt.toDate().getTime() < Date.now()) {
      t.delete(challengeRef);
      throw new functions.https.HttpsError('deadline-exceeded', 'Verification code expired.');
    }
    
    if (challenge.attemptsRemaining <= 0) {
      t.delete(challengeRef);
      throw new functions.https.HttpsError('resource-exhausted', 'Too many failed attempts.');
    }
    
    const inputHash = hashOTP(code, challenge.salt);
    if (inputHash !== challenge.hashedCode) {
      const attemptsLeft = challenge.attemptsRemaining - 1;
      if (attemptsLeft <= 0) {
        t.delete(challengeRef);
        throw new functions.https.HttpsError('resource-exhausted', 'Too many failed attempts.');
      }
      t.update(challengeRef, { attemptsRemaining: attemptsLeft });
      throw new functions.https.HttpsError('permission-denied', `Incorrect code. ${attemptsLeft} attempts remaining.`);
    }
    
    // Code is valid
    t.delete(challengeRef);
    t.update(db.collection('users').doc(uid), { twoFactorEnabled: true });
    return true;
  });
  
  return { success: result };
});

// ---------------------------------------------------------------------------
// 5. disableTwoFactor
// ---------------------------------------------------------------------------
export const disableTwoFactor = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }
  
  const { challengeId, code, apiKey, password } = request.data;
  const uid = request.auth.uid;
  const email = request.auth.token.email;
  
  if (!password || !apiKey || !challengeId || !code || !email) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing parameters.');
  }
  
  // 1. Verify password
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const authRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  
  if (!authRes.ok) {
    throw new functions.https.HttpsError('unauthenticated', 'Invalid password.');
  }
  
  // 2. Verify OTP
  const db = admin.firestore();
  const challengeRef = db.collection('twoFactorChallenges').doc(challengeId);
  
  await db.runTransaction(async (t) => {
    const doc = await t.get(challengeRef);
    if (!doc.exists) throw new functions.https.HttpsError('not-found', 'Verification code expired or not found.');
    
    const challenge = doc.data()!;
    if (challenge.uid !== uid) throw new functions.https.HttpsError('permission-denied', 'Invalid challenge.');
    if (challenge.expiresAt.toDate().getTime() < Date.now()) {
      t.delete(challengeRef);
      throw new functions.https.HttpsError('deadline-exceeded', 'Verification code expired.');
    }
    if (challenge.attemptsRemaining <= 0) {
      t.delete(challengeRef);
      throw new functions.https.HttpsError('resource-exhausted', 'Too many failed attempts.');
    }
    
    const inputHash = hashOTP(code, challenge.salt);
    if (inputHash !== challenge.hashedCode) {
      const attemptsLeft = challenge.attemptsRemaining - 1;
      if (attemptsLeft <= 0) {
        t.delete(challengeRef);
        throw new functions.https.HttpsError('resource-exhausted', 'Too many failed attempts.');
      }
      t.update(challengeRef, { attemptsRemaining: attemptsLeft });
      throw new functions.https.HttpsError('permission-denied', `Incorrect code. ${attemptsLeft} attempts remaining.`);
    }
    
    // Code valid
    t.delete(challengeRef);
    t.update(db.collection('users').doc(uid), { 
      twoFactorEnabled: false,
      trustedDevices: [] 
    });
  });
  
  return { success: true };
});

// ---------------------------------------------------------------------------
// 6. revokeTrustedDevices
// ---------------------------------------------------------------------------
export const revokeTrustedDevices = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }
  
  const uid = request.auth.uid;
  const db = admin.firestore();
  await db.collection('users').doc(uid).update({ trustedDevices: [] });
  
  return { success: true };
});

// ---------------------------------------------------------------------------
// 7. adminResetUserTwoFactor
// ---------------------------------------------------------------------------
export const adminResetUserTwoFactor = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }
  
  const { targetUid } = request.data;
  if (!targetUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing targetUid.');
  }
  
  const db = admin.firestore();
  
  // Verify caller is admin
  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin.');
  }
  
  await db.collection('users').doc(targetUid).update({
    twoFactorEnabled: false,
    trustedDevices: []
  });
  
  return { success: true };
});
