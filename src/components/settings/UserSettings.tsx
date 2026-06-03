import React, { useState, useEffect } from 'react';
import { Form, Alert, Modal, Button } from 'react-bootstrap';
import { auth, db, functions } from '../../firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail, updatePassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import FormField from '../common/FormField';
import LoadingButton from '../common/LoadingButton';
import { validatePassword } from '../../utils/passwordValidation';

export default function UserSettings() {
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Original state to detect changes
  const [origFullName, setOrigFullName] = useState('');
  const [origEmail, setOrigEmail] = useState('');
  const [role, setRole] = useState('user');

  // Re-auth Modal State
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);

  // Account Deletion Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Admin Purge Modal State
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgePassword, setPurgePassword] = useState('');
  const [purgeConfirmation, setPurgeConfirmation] = useState('');
  const [purgeError, setPurgeError] = useState('');
  const [purgeLoading, setPurgeLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFullName(data.fullName || '');
            setOrigFullName(data.fullName || '');
            setRole(data.role || 'user');
          }
          setEmail(user.email || '');
          setOrigEmail(user.email || '');
        } catch (err) {
          console.error('Error fetching user for settings:', err);
        } finally {
          setInitLoading(false);
        }
      } else {
        setInitLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const requiresReauth = email !== origEmail || password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password) {
      const validation = validatePassword(password);
      if (!validation.isValid) {
        setError(validation.errors.join(' '));
        return;
      }
    }

    // If email is being changed, verify it's available first
    if (email !== origEmail) {
      setLoading(true);
      try {
        const checkEmailAvailabilityFn = httpsCallable(functions, 'checkEmailAvailability');
        const emailCheckResult = await checkEmailAvailabilityFn({ email });
        const { available, reason } = emailCheckResult.data as { available: boolean; reason?: string };

        if (!available) {
          if (reason === 'registered') {
            setError("This email address is already in use by another account.");
          } else if (reason === 'pending') {
            setError("This email address is currently associated with a pending application.");
          } else {
            setError("This email address is not available.");
          }
          setLoading(false);
          return;
        }
      } catch (err: unknown) {
        console.error('Email check error:', err);
        setError("Error verifying email availability. Please try again.");
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    if (requiresReauth) {
      setShowReauthModal(true);
      return;
    }

    // Only name changed
    await applyChanges();
  };

  const handleReauthAndApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setReauthError('');
    setReauthLoading(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('User not found.');

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      setShowReauthModal(false);
      setCurrentPassword('');
      await applyChanges();
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setReauthError('Incorrect password.');
      } else {
        setReauthError(error.message || 'Authentication failed.');
      }
    } finally {
      setReauthLoading(false);
    }
  };

  const applyChanges = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not logged in.');

      let passwordChanged = false;
      let emailChanged = false;

      // 1. Update Auth Email
      if (email !== origEmail) {
        await updateEmail(user, email);
        emailChanged = true;
      }

      // 2. Update Auth Password
      if (password) {
        await updatePassword(user, password);
        passwordChanged = true;
      }

      // 3. Update Firestore + Notify Admins using Cloud Function
      const nameChanged = fullName !== origFullName;
      if (nameChanged || emailChanged || passwordChanged) {
        const updateOwnProfile = httpsCallable(functions, 'updateOwnProfile');
        await updateOwnProfile({
          fullName: nameChanged ? fullName : undefined,
          email: emailChanged ? email : undefined,
          passwordChanged
        });
      }

      setOrigFullName(fullName);
      setOrigEmail(email);
      setPassword('');
      setConfirmPassword('');
      setSuccess('Profile updated successfully.');
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err: unknown) {
      console.error('Settings update error:', err);
      // Revert email if failed half-way or handle specific errors
      setError((err as Error).message || 'An error occurred while updating your profile.');
      
      // Attempt to revert to auth.currentUser.email if it didn't change
      if (auth.currentUser?.email) {
        setEmail(auth.currentUser.email);
        setOrigEmail(auth.currentUser.email);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');

    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.');
      return;
    }

    setDeleteLoading(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('User not found.');

      // 1. Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      
      // 2. Call deleteOwnAccount function
      const deleteOwnAccountFn = httpsCallable(functions, 'deleteOwnAccount');
      await deleteOwnAccountFn();

      // 3. Explicitly sign out client-side to trigger local state cleanup and router redirect
      await signOut(auth);
      
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setDeleteError('Incorrect password.');
      } else {
        setDeleteError(error.message || 'Failed to delete account.');
      }
      setDeleteLoading(false);
    }
  };

  const handlePurgeSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurgeError('');

    if (purgeConfirmation !== 'PURGE ALL SUBMISSIONS AND METRICS') {
      setPurgeError('Please type the exact phrase to confirm.');
      return;
    }

    setPurgeLoading(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('User not found.');

      // 1. Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, purgePassword);
      await reauthenticateWithCredential(user, credential);
      
      // 2. Trigger automatic backup
      const { triggerSystemBackup } = await import('../../utils/backupUtils');
      await triggerSystemBackup();

      // 3. Call purgeSystemData function
      const purgeSystemDataFn = httpsCallable(functions, 'purgeSystemData');
      await purgeSystemDataFn();
      
      setSuccess('System data purged successfully. A backup was downloaded.');
      setShowPurgeModal(false);
      setPurgePassword('');
      setPurgeConfirmation('');
      setTimeout(() => setSuccess(''), 8000);
      
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setPurgeError('Incorrect password.');
      } else {
        setPurgeError(error.message || 'Failed to purge system data.');
      }
    } finally {
      setPurgeLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const isPristine = fullName === origFullName && email === origEmail && !password;

  return (
    <div className="py-3">
      <div className="analytics-card" style={{ background: '#fff', width: '100%' }}>
        <div className="chart-card-header chart-header-primary">
          <p className="chart-card-title">
            <span className="material-symbols-outlined icon-primary" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
              manage_accounts
            </span>
            Profile Settings
          </p>
          <p className="chart-card-subtitle">Update your personal information and credentials</p>
        </div>
        
        <div className="px-4 py-4">
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          {success && <Alert variant="success" className="py-2">{success}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <div className="row g-4">
              <div className="col-md-6">
                <div className="p-4 rounded-3 border h-100" style={{ background: '#FAFAFA', borderColor: '#F4F4F5' }}>
                  <h6 className="mb-4 fw-bold d-flex align-items-center" style={{ fontSize: '14px', letterSpacing: '0.02em', color: '#18181B' }}>
                    <span className="material-symbols-outlined me-2" style={{ fontSize: '18px', color: '#4F46E5', fontVariationSettings: "'FILL' 1" }}>person</span>
                    Personal Information
                  </h6>
                  
                  <FormField
                    label="Full Name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                  />
                  
                  <FormField
                    label="Email Address"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    helpText="Changing your email requires your current password."
                    className="mb-0"
                  />
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="p-4 rounded-3 border h-100" style={{ background: '#FAFAFA', borderColor: '#F4F4F5' }}>
                  <h6 className="mb-4 fw-bold d-flex align-items-center" style={{ fontSize: '14px', letterSpacing: '0.02em', color: '#18181B' }}>
                    <span className="material-symbols-outlined me-2" style={{ fontSize: '18px', color: '#4F46E5', fontVariationSettings: "'FILL' 1" }}>lock</span>
                    Change Password
                  </h6>
                  
                  <FormField
                    label="New Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    helpText="Leave blank if you don't want to change it."
                  />
                  
                  <FormField
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="mb-0"
                  />
                </div>
              </div>
            </div>
            
            <div className="d-flex justify-content-end mt-4 pt-3 border-top">
              <LoadingButton 
                variant="primary" 
                type="submit" 
                loading={loading}
                disabled={isPristine}
                className="px-4 py-2 shadow-sm d-inline-flex align-items-center"
                style={{ fontWeight: 600, fontSize: '14px', borderRadius: '8px' }}
              >
                <span className="material-symbols-outlined me-2" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>save</span>
                Save Changes
              </LoadingButton>
            </div>
          </Form>
        </div>
      </div>

      {/* Danger Zone */}
      {role !== 'admin' && (
        <div className="analytics-card mt-4" style={{ background: '#fff', width: '100%', border: '1px solid #FEE2E2' }}>
          <div className="px-4 py-4">
            <h6 className="mb-2 fw-bold text-danger d-flex align-items-center" style={{ fontSize: '14px', letterSpacing: '0.02em' }}>
              <span className="material-symbols-outlined me-2" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>warning</span>
              Danger Zone
            </h6>
            <p className="text-muted small mb-4" style={{ maxWidth: '600px' }}>
              Once you delete your account, there is no going back. Please be certain. Your past submissions will be retained for administrative auditing, but your personal account and login will be permanently removed.
            </p>
            <Button variant="outline-danger" onClick={() => setShowDeleteModal(true)} style={{ fontWeight: 600, fontSize: '14px', borderRadius: '8px' }}>
              Delete Account
            </Button>
          </div>
        </div>
      )}

      {role === 'admin' && (
        <div className="analytics-card mt-4" style={{ background: '#fff', width: '100%', border: '1px solid #FEE2E2' }}>
          <div className="px-4 py-4">
            <h6 className="mb-2 fw-bold text-danger d-flex align-items-center" style={{ fontSize: '14px', letterSpacing: '0.02em' }}>
              <span className="material-symbols-outlined me-2" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>warning</span>
              Admin Danger Zone
            </h6>
            <p className="text-muted small mb-4" style={{ maxWidth: '600px' }}>
              Purging system data will permanently wipe all pending and historical submissions, file uploads, and perennial counts. User accounts and system settings will remain intact. This action cannot be undone. A JSON backup will be generated before deletion.
            </p>
            <Button variant="danger" onClick={() => setShowPurgeModal(true)} style={{ fontWeight: 600, fontSize: '14px', borderRadius: '8px' }}>
              Purge System Data
            </Button>
          </div>
        </div>
      )}

      {/* Re-auth Modal */}
      <Modal show={showReauthModal} onHide={() => !reauthLoading && setShowReauthModal(false)} centered backdrop="static">
        <Modal.Header closeButton={!reauthLoading} className="border-0 pb-0" />
        <Modal.Body className="px-4 pb-4 pt-0">
          <div className="text-center mb-4">
            <span className="material-symbols-outlined text-warning mb-2" style={{ fontSize: '40px' }}>
              lock_person
            </span>
            <h5 className="fw-bold mb-1">Confirm Identity</h5>
            <p className="text-muted small mb-0">
              For security, please enter your current password to apply these sensitive changes.
            </p>
          </div>
          
          {reauthError && <Alert variant="danger" className="py-2 small">{reauthError}</Alert>}
          
          <Form onSubmit={handleReauthAndApply}>
            <FormField
              label="Current Password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={reauthLoading}
              className="mb-4"
            />
            
            <div className="d-flex justify-content-end gap-2">
              <Button 
                variant="light" 
                onClick={() => setShowReauthModal(false)}
                disabled={reauthLoading}
              >
                Cancel
              </Button>
              <LoadingButton 
                variant="primary" 
                type="submit" 
                loading={reauthLoading}
              >
                Confirm
              </LoadingButton>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Account Deletion Modal */}
      <Modal show={showDeleteModal} onHide={() => !deleteLoading && setShowDeleteModal(false)} centered backdrop="static">
        <Modal.Header closeButton={!deleteLoading} className="border-0 pb-0" />
        <Modal.Body className="px-4 pb-4 pt-0">
          <div className="text-center mb-4">
            <span className="material-symbols-outlined text-danger mb-2" style={{ fontSize: '40px' }}>
              warning
            </span>
            <h5 className="fw-bold mb-1 text-danger">Delete Account</h5>
            <p className="text-muted small mb-0">
              This action is permanent. Enter your password and type <strong>DELETE</strong> to confirm.
            </p>
          </div>
          
          {deleteError && <Alert variant="danger" className="py-2 small">{deleteError}</Alert>}
          
          <Form onSubmit={handleDeleteAccount}>
            <FormField
              label="Current Password"
              type="password"
              required
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={deleteLoading}
            />
            
            <FormField
              label='Type "DELETE" to confirm'
              type="text"
              required
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              disabled={deleteLoading}
              className="mb-4"
            />
            
            <div className="d-flex justify-content-end gap-2">
              <Button 
                variant="light" 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <LoadingButton 
                variant="danger" 
                type="submit" 
                loading={deleteLoading}
              >
                Permanently Delete
              </LoadingButton>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* System Purge Modal */}
      <Modal show={showPurgeModal} onHide={() => !purgeLoading && setShowPurgeModal(false)} centered backdrop="static">
        <Modal.Header closeButton={!purgeLoading} className="border-0 pb-0" />
        <Modal.Body className="px-4 pb-4 pt-0">
          <div className="text-center mb-4">
            <span className="material-symbols-outlined text-danger mb-2" style={{ fontSize: '40px' }}>
              delete_forever
            </span>
            <h5 className="fw-bold mb-1 text-danger">Purge System Data</h5>
            <p className="text-muted small mb-0">
              This will irreversibly delete all submissions and files. A JSON backup will be created automatically.
            </p>
          </div>
          
          {purgeError && <Alert variant="danger" className="py-2 small">{purgeError}</Alert>}
          
          <Form onSubmit={handlePurgeSystem}>
            <FormField
              label="Admin Password"
              type="password"
              required
              value={purgePassword}
              onChange={(e) => setPurgePassword(e.target.value)}
              disabled={purgeLoading}
            />
            
            <FormField
              label='Type "PURGE ALL SUBMISSIONS AND METRICS" to confirm'
              type="text"
              required
              value={purgeConfirmation}
              onChange={(e) => setPurgeConfirmation(e.target.value)}
              disabled={purgeLoading}
              className="mb-4"
            />
            
            <div className="d-flex justify-content-end gap-2">
              <Button 
                variant="light" 
                onClick={() => setShowPurgeModal(false)}
                disabled={purgeLoading}
              >
                Cancel
              </Button>
              <LoadingButton 
                variant="danger" 
                type="submit" 
                loading={purgeLoading}
              >
                Purge Data
              </LoadingButton>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
