import React, { useState, useEffect, useRef } from 'react';
import { Form, Alert, Modal, Button } from 'react-bootstrap';
import { auth, db, functions, storage } from '../../firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import FormField from '../common/FormField';
import LoadingButton from '../common/LoadingButton';
import { validatePassword } from '../../utils/passwordValidation';
import { compressImage } from '../../utils/imageCompression';

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

  // Governance & Contact State
  const [designation, setDesignation] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [socialLinks, setSocialLinks] = useState<{ platform: string, url: string }[]>([]);
  
  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Original state to detect changes
  const [origFullName, setOrigFullName] = useState('');
  const [origEmail, setOrigEmail] = useState('');
  const [origDesignation, setOrigDesignation] = useState('');
  const [origContactNumber, setOrigContactNumber] = useState('');
  const [origAddress, setOrigAddress] = useState('');
  const [origSocialLinks, setOrigSocialLinks] = useState<{ platform: string, url: string }[]>([]);
  const [origAvatarUrl, setOrigAvatarUrl] = useState('');
  
  const [role, setRole] = useState('user');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // 2FA State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorAction, setTwoFactorAction] = useState<'enable' | 'disable' | null>(null);
  const [challengeId, setChallengeId] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

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
            setTwoFactorEnabled(data.twoFactorEnabled || false);
            
            setDesignation(data.designation || '');
            setOrigDesignation(data.designation || '');
            setContactNumber(data.contactNumber || '');
            setOrigContactNumber(data.contactNumber || '');
            setAddress(data.address || '');
            setOrigAddress(data.address || '');
            setSocialLinks(data.socialLinks || []);
            setOrigSocialLinks(data.socialLinks || []);
            setAvatarUrl(data.avatarUrl || '');
            setOrigAvatarUrl(data.avatarUrl || '');
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
  
  const handleSocialPlatformChange = (index: number, value: string) => {
    const updated = [...socialLinks];
    updated[index].platform = value;
    setSocialLinks(updated);
  };
  
  const handleSocialUrlChange = (index: number, value: string) => {
    const updated = [...socialLinks];
    updated[index].url = value;
    setSocialLinks(updated);
  };
  
  const removeSocialLink = (index: number) => {
    const updated = socialLinks.filter((_, i) => i !== index);
    setSocialLinks(updated);
  };
  
  const addSocialLink = () => {
    if (socialLinks.length < 4) {
      setSocialLinks([...socialLinks, { platform: 'facebook', url: '' }]);
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const result = await compressImage(file, 400, 0.85);
      setAvatarFile(result.file);
      setAvatarPreview(result.previewUrl);
      setRemoveAvatar(false);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to process image.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarUrl('');
    setRemoveAvatar(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    
    // Validate Social Links
    for (const link of socialLinks) {
      if (!link.url.trim()) {
        setError('Please fill out all social media URLs or remove empty ones.');
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

    await applyChanges();
  };

  const handleRequest2FA = async (action: 'enable' | 'disable') => {
    setTwoFactorAction(action);
    setTwoFactorError('');
    setTwoFactorLoading(true);
    try {
      const req2FA = httpsCallable(functions, 'requestTwoFactorEnrollment');
      const res = await req2FA();
      const data = res.data as { challengeId: string };
      setChallengeId(data.challengeId);
      setShow2FAModal(true);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError('');
    setTwoFactorLoading(true);
    try {
      if (twoFactorAction === 'enable') {
        const confirm = httpsCallable(functions, 'confirmTwoFactorEnrollment');
        await confirm({ challengeId, code: twoFactorCode });
        setTwoFactorEnabled(true);
        setSuccess('Two-Factor Authentication enabled successfully.');
      } else {
        const disable = httpsCallable(functions, 'disableTwoFactor');
        const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
        await disable({ challengeId, code: twoFactorCode, apiKey, password: disablePassword });
        setTwoFactorEnabled(false);
        setSuccess('Two-Factor Authentication disabled successfully.');
      }
      setShow2FAModal(false);
      setTwoFactorCode('');
      setDisablePassword('');
    } catch (err: unknown) {
      if (err instanceof Error) setTwoFactorError(err.message);
      else setTwoFactorError(String(err));
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleRevokeDevices = async () => {
    if (!window.confirm("Are you sure you want to revoke all trusted devices? You will be asked for an OTP on your next login from any device.")) return;
    try {
      const revoke = httpsCallable(functions, 'revokeTrustedDevices');
      await revoke();
      setSuccess('All trusted devices have been revoked.');
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
    }
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

      let finalAvatarUrl = avatarUrl;
      
      // Handle Avatar Upload or Deletion
      if (removeAvatar && origAvatarUrl) {
        // Just delete from DB, let's leave the storage alone or delete it
        // We'll trust the DB value override.
        finalAvatarUrl = '';
      } else if (avatarFile) {
        const ext = avatarFile.type === 'image/webp' ? 'webp' : 'jpg';
        const storageRef = ref(storage, `avatars/${user.uid}/avatar.${ext}`);
        await uploadBytes(storageRef, avatarFile);
        finalAvatarUrl = await getDownloadURL(storageRef);
      }

      let passwordChanged = false;
      let emailVerificationSent = false;

      // 1. Update Auth Password
      if (password) {
        await updatePassword(user, password);
        passwordChanged = true;
      }

      // 2. Update Auth Profile details (and/or request email verification) via single Cloud Function call
      const nameChanged = fullName !== origFullName;
      const emailChanged = email !== origEmail;
      
      const designChanged = designation !== origDesignation;
      const contactChanged = contactNumber !== origContactNumber;
      const addressChanged = address !== origAddress;
      const socialChanged = JSON.stringify(socialLinks) !== JSON.stringify(origSocialLinks);
      const avatarChanged = finalAvatarUrl !== origAvatarUrl;

      if (nameChanged || emailChanged || passwordChanged || designChanged || contactChanged || addressChanged || socialChanged || avatarChanged) {
        const updateOwnProfile = httpsCallable(functions, 'updateOwnProfile');
        const payload: Record<string, unknown> = { passwordChanged };
        
        if (nameChanged) payload.fullName = fullName;
        if (emailChanged) payload.email = email;
        if (designChanged) payload.designation = designation;
        if (contactChanged) payload.contactNumber = contactNumber;
        if (addressChanged) payload.address = address;
        if (socialChanged) payload.socialLinks = socialLinks;
        if (avatarChanged) payload.avatarUrl = finalAvatarUrl;
        
        const res = await updateOwnProfile(payload);
        const data = res.data as { verificationSent?: boolean };
        if (data.verificationSent) {
          emailVerificationSent = true;
        }
      }

      setOrigFullName(fullName);
      setOrigDesignation(designation);
      setOrigContactNumber(contactNumber);
      setOrigAddress(address);
      setOrigSocialLinks([...socialLinks]);
      setOrigAvatarUrl(finalAvatarUrl);
      setAvatarUrl(finalAvatarUrl);
      
      // Clear File State
      setAvatarFile(null);
      setAvatarPreview(null);
      setRemoveAvatar(false);
      
      if (emailVerificationSent) {
        localStorage.setItem('pendingEmailChange', email);
        setEmail(origEmail);
        if (nameChanged || passwordChanged || designChanged || contactChanged || addressChanged || socialChanged || avatarChanged) {
          setSuccess('Profile details updated. A verification link has been sent to your new email. Please verify it to complete the email change.');
        } else {
          setSuccess('A verification link has been sent to your new email. Please check your inbox and verify the email before it can be updated.');
        }
      } else {
        setOrigEmail(email);
        setSuccess('Profile updated successfully.');
      }
      
      setPassword('');
      setConfirmPassword('');
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err: unknown) {
      console.error('Settings update error:', err);
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

  const isPristine = fullName === origFullName && 
    email === origEmail && 
    !password &&
    designation === origDesignation &&
    contactNumber === origContactNumber &&
    address === origAddress &&
    JSON.stringify(socialLinks) === JSON.stringify(origSocialLinks) &&
    !avatarFile && !removeAvatar;
    
  const currentAvatarSrc = avatarPreview || avatarUrl;

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
          <p className="chart-card-subtitle">Update your personal information, public profile, and credentials</p>
        </div>
        
        <div className="px-4 py-4">
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          {success && <Alert variant="success" className="py-2">{success}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <div className="row g-4 mb-4">
              {/* Avatar Section */}
              <div className="col-12">
                <div className="p-4 rounded-3 border d-flex align-items-center gap-4" style={{ background: '#FAFAFA', borderColor: '#F4F4F5' }}>
                  <div 
                    className="rounded-circle border overflow-hidden d-flex align-items-center justify-content-center bg-white shadow-sm"
                    style={{ width: '80px', height: '80px', flexShrink: 0 }}
                  >
                    {currentAvatarSrc ? (
                      <img src={currentAvatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span className="material-symbols-outlined text-muted" style={{ fontSize: '40px' }}>person</span>
                    )}
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1" style={{ fontSize: '14px', color: '#18181B' }}>Profile Picture</h6>
                    <p className="text-muted small mb-2">Upload a professional photo (JPG, PNG). Will be resized to a square.</p>
                    <div className="d-flex gap-2">
                      <Button variant="outline-primary" size="sm" onClick={() => fileInputRef.current?.click()}>
                        Choose Photo
                      </Button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarSelect}
                      />
                      {(currentAvatarSrc) && (
                        <Button variant="outline-danger" size="sm" onClick={handleRemoveAvatar}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            
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
                    <span className="material-symbols-outlined me-2" style={{ fontSize: '18px', color: '#4F46E5', fontVariationSettings: "'FILL' 1" }}>badge</span>
                    Governance Details
                  </h6>
                  
                  <FormField
                    label="Official Designation / Role"
                    type="text"
                    placeholder="e.g. SK Chairperson, SK Kagawad"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    disabled={loading}
                  />
                  
                  <FormField
                    label="Contact Number"
                    type="text"
                    placeholder="e.g. +63 912 345 6789"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    disabled={loading}
                  />
                  
                  <FormField
                    label="Barangay Hall Address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={loading}
                    className="mb-0"
                  />
                </div>
              </div>
            </div>

            {/* Social Media Manager */}
            <div className="p-4 rounded-3 border mb-4" style={{ background: '#FAFAFA', borderColor: '#F4F4F5' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold d-flex align-items-center m-0" style={{ fontSize: '14px', letterSpacing: '0.02em', color: '#18181B' }}>
                  <span className="material-symbols-outlined me-2" style={{ fontSize: '18px', color: '#4F46E5', fontVariationSettings: "'FILL' 1" }}>share</span>
                  Social Media Links
                </h6>
                {socialLinks.length < 4 && (
                  <Button variant="outline-primary" size="sm" onClick={addSocialLink} disabled={loading} className="d-flex align-items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                    Add Link
                  </Button>
                )}
              </div>
              
              {socialLinks.length === 0 ? (
                <p className="text-muted small mb-0">No social media links added. You can add up to 4.</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {socialLinks.map((link, idx) => (
                    <div key={idx} className="d-flex gap-2">
                      <Form.Select 
                        value={link.platform} 
                        onChange={(e) => handleSocialPlatformChange(idx, e.target.value)}
                        disabled={loading}
                        style={{ width: '150px' }}
                      >
                        <option value="facebook">Facebook</option>
                        <option value="instagram">Instagram</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="twitter">X (Twitter)</option>
                        <option value="tiktok">TikTok</option>
                        <option value="youtube">YouTube</option>
                        <option value="website">Website</option>
                      </Form.Select>
                      <Form.Control 
                        type="text"
                        placeholder="URL (e.g. facebook.com/username)"
                        value={link.url}
                        onChange={(e) => handleSocialUrlChange(idx, e.target.value)}
                        disabled={loading}
                      />
                      <Button variant="outline-danger" onClick={() => removeSocialLink(idx)} disabled={loading}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="row g-4">
              <div className="col-12">
                <div className="p-4 rounded-3 border h-100" style={{ background: '#FAFAFA', borderColor: '#F4F4F5' }}>
                  <h6 className="mb-4 fw-bold d-flex align-items-center" style={{ fontSize: '14px', letterSpacing: '0.02em', color: '#18181B' }}>
                    <span className="material-symbols-outlined me-2" style={{ fontSize: '18px', color: '#4F46E5', fontVariationSettings: "'FILL' 1" }}>lock</span>
                    Change Password
                  </h6>
                  <div className="row">
                    <div className="col-md-6">
                      <FormField
                        label="New Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        helpText="Leave blank if you don't want to change it."
                      />
                    </div>
                    <div className="col-md-6">
                      <FormField
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
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

      {/* Security & 2FA */}
      <div className="analytics-card mt-4" style={{ background: '#fff', width: '100%' }}>
        <div className="px-4 py-4">
          <h6 className="mb-4 fw-bold d-flex align-items-center" style={{ fontSize: '14px', letterSpacing: '0.02em', color: '#18181B' }}>
            <span className="material-symbols-outlined me-2" style={{ fontSize: '18px', color: '#4F46E5', fontVariationSettings: "'FILL' 1" }}>shield</span>
            Two-Factor Authentication (2FA)
          </h6>
          
          <div className="d-flex align-items-center justify-content-between border p-3 rounded-3" style={{ background: '#FAFAFA', borderColor: '#F4F4F5' }}>
            <div>
              <p className="mb-1 fw-semibold text-dark">Email 2FA is currently <span className={twoFactorEnabled ? 'text-success' : 'text-danger'}>{twoFactorEnabled ? 'Enabled' : 'Disabled'}</span></p>
              <p className="text-muted small mb-0">Protect your account with an extra layer of security. We'll send a 6-digit code to your email upon login.</p>
            </div>
            <div>
              {twoFactorEnabled ? (
                <LoadingButton variant="outline-danger" loading={twoFactorLoading} onClick={() => handleRequest2FA('disable')} style={{ fontWeight: 600, fontSize: '14px', borderRadius: '8px' }}>
                  Disable 2FA
                </LoadingButton>
              ) : (
                <LoadingButton variant="primary" loading={twoFactorLoading} onClick={() => handleRequest2FA('enable')} style={{ fontWeight: 600, fontSize: '14px', borderRadius: '8px' }}>
                  Enable 2FA
                </LoadingButton>
              )}
            </div>
          </div>
          
          {twoFactorEnabled && (
            <div className="mt-3">
              <Button variant="link" className="p-0 text-decoration-none small text-danger fw-semibold" onClick={handleRevokeDevices}>
                Revoke all trusted devices
              </Button>
            </div>
          )}
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

      {/* 2FA Action Modal */}
      <Modal show={show2FAModal} onHide={() => !twoFactorLoading && setShow2FAModal(false)} centered backdrop="static">
        <Modal.Header closeButton={!twoFactorLoading} className="border-0 pb-0" />
        <Modal.Body className="px-4 pb-4 pt-0">
          <div className="text-center mb-4">
            <span className="material-symbols-outlined text-primary mb-2" style={{ fontSize: '40px' }}>
              security
            </span>
            <h5 className="fw-bold mb-1">{twoFactorAction === 'enable' ? 'Enable Two-Factor Auth' : 'Disable Two-Factor Auth'}</h5>
            <p className="text-muted small mb-0">
              We've sent a 6-digit verification code to your email. Enter it below to confirm.
            </p>
          </div>
          
          {twoFactorError && <Alert variant="danger" className="py-2 small">{twoFactorError}</Alert>}
          
          <Form onSubmit={handleConfirm2FA}>
            {twoFactorAction === 'disable' && (
              <FormField
                label="Account Password"
                type="password"
                required
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                disabled={twoFactorLoading}
                className="mb-3"
              />
            )}
            <FormField
              label="6-Digit OTP"
              type="text"
              required
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              disabled={twoFactorLoading}
              className="mb-4"
            />
            
            <div className="d-flex justify-content-end gap-2">
              <Button 
                variant="light" 
                onClick={() => setShow2FAModal(false)}
                disabled={twoFactorLoading}
              >
                Cancel
              </Button>
              <LoadingButton 
                variant={twoFactorAction === 'enable' ? 'primary' : 'danger'} 
                type="submit" 
                loading={twoFactorLoading}
                disabled={twoFactorCode.length !== 6 || (twoFactorAction === 'disable' && !disablePassword)}
              >
                Confirm
              </LoadingButton>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
