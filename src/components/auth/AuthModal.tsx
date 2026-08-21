import React, { useState, useRef } from 'react';
import { Modal, Form, Alert } from 'react-bootstrap';
import { auth, db, storage, functions } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { BARANGAYS } from '../../constants/barangays';
import LoadingButton from '../common/LoadingButton';
import lydoLogo from '../../assets/lydo-logo.webp';

interface AuthModalProps {
  show: boolean;
  onHide: () => void;
  initialMode?: 'login' | 'register' | 'forgot-password';
}

type AuthMode = 'login' | 'register' | 'forgot-password';

export default function AuthModal({ show, onHide, initialMode = 'login' }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBarangay, setRegBarangay] = useState('');
  const [regFile, setRegFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [honeypotValue, setHoneypotValue] = useState('');
  const lastSubmitTimeRef = useRef<number>(0);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      onHide();
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('auth/invalid-credential') || err.message.includes('auth/user-not-found') || err.message.includes('auth/wrong-password')) {
          setError('Invalid email or password. Please verify your credentials.');
        } else if (err.message.includes('auth/too-many-requests')) {
          setError('Access temporarily disabled due to multiple failed attempts. Try again later or reset your password.');
        } else {
          setError(err.message);
        }
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (honeypotValue.trim() !== '') {
      console.warn('Automated submission filtered.');
      setLoading(false);
      return;
    }

    const now = Date.now();
    if (now - lastSubmitTimeRef.current < 5000) {
      setError('Please wait a few seconds before trying again.');
      return;
    }
    lastSubmitTimeRef.current = now;

    if (!regFile) {
      setError('Please upload your SK validation document.');
      return;
    }
    if (!regBarangay) {
      setError('Please select your barangay.');
      return;
    }

    setLoading(true);
    try {
      // 1. Check email availability first via Cloud Function
      const checkEmailAvailabilityFn = httpsCallable(functions, 'checkEmailAvailability');
      const emailCheckResult = await checkEmailAvailabilityFn({ email: regEmail });
      const { available, reason } = emailCheckResult.data as { available: boolean; reason?: string };

      if (!available) {
        if (reason === 'registered') {
          setError('This email address is already registered to an approved SK Official.');
        } else if (reason === 'pending') {
          setError('This email address already has a pending registration application under review.');
        } else {
          setError('This email address is currently not available for registration.');
        }
        setLoading(false);
        return;
      }

      // 2. Upload File to Storage
      const fileExt = regFile.name.split('.').pop() || 'pdf';
      const storagePath = `temp_proofs/${Date.now()}_${regName.replace(/\s+/g, '_')}.${fileExt}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, regFile);

      // 3. Save Application to pending_users collection
      const cleanEmail = regEmail.trim().toLowerCase();
      const docId = cleanEmail.replace(/[^a-zA-Z0-9.\-_]/g, '_');

      await setDoc(doc(db, 'pending_users', docId), {
        fullName: regName,
        email: cleanEmail,
        barangay: regBarangay,
        proofStoragePath: storagePath,
        submittedAt: serverTimestamp()
      });

      setSuccess('Your application was submitted successfully! You will receive an email once approved by the LYDO Administrator.');
      setRegName('');
      setRegEmail('');
      setRegBarangay('');
      setRegFile(null);
      setAuthMode('login');
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!forgotEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const requestPasswordReset = httpsCallable(functions, 'requestPasswordReset');
      await requestPasswordReset({ email: forgotEmail });

      setSuccess('If an approved account exists with this email, a password reset link has been dispatched to your inbox.');
      setForgotEmail('');
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  // File Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!validExtensions.includes(ext)) {
      setError('Please upload a valid document format (.pdf, .png, .jpg).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit. Please upload a smaller file.');
      return;
    }
    setError('');
    setRegFile(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Modal
      show={show}
      onHide={loading ? () => {} : onHide}
      centered
      backdrop="static"
      keyboard={!loading}
      dialogClassName="auth-modal-dialog"
      contentClassName="auth-modal-content"
    >
      <div className="auth-split-layout">
        {/* Left Side: Brand Visual Panel */}
        <div className="auth-brand-sidebar">
          <div className="auth-brand-main-block">
            <div className="auth-logo-hero-wrap">
              <div className="auth-logo-glow" />
              <div className="auth-logo-circle">
                <img
                  src={lydoLogo}
                  alt="LYDO Seal"
                  className="auth-logo-img"
                />
              </div>
            </div>

            <h3 className="auth-brand-title">
              Youth Governance & Compliance Portal
            </h3>

            <p className="auth-brand-subtitle">
              {authMode === 'login' && 'Access the official centralized repository for SK compliance reports and monitoring.'}
              {authMode === 'register' && 'Submit your credentials for official verification and join the Lucena SK network.'}
              {authMode === 'forgot-password' && 'Secure automated credential recovery for verified SK and LYDO officials.'}
            </p>
          </div>

          <div className="auth-brand-footer">
            Republic of the Philippines • City Government of Lucena
          </div>
        </div>

        {/* Right Side: Interactive Form Container */}
        <div className="auth-form-panel">
          {/* Top Close Button */}
          <button
            type="button"
            className="auth-modal-close-btn"
            onClick={loading ? undefined : onHide}
            disabled={loading}
            aria-label="Close dialog"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div>
            {/* Tab Switcher (Visible in login & register modes) */}
            {authMode !== 'forgot-password' ? (
              <div className="auth-tab-switcher">
                <button
                  type="button"
                  className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => switchMode('login')}
                  disabled={loading}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
                  onClick={() => switchMode('register')}
                  disabled={loading}
                >
                  Apply for Account
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none small text-secondary d-inline-flex align-items-center gap-1.5 fw-semibold"
                  onClick={() => switchMode('login')}
                  disabled={loading}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back to Sign In
                </button>
              </div>
            )}

            {/* Title / Subheading */}
            <div className="mb-3">
              <h4 className="fw-bold text-dark mb-1" style={{ letterSpacing: '-0.01em' }}>
                {authMode === 'login' && 'Sign in to Portal'}
                {authMode === 'register' && 'SK Official Application'}
                {authMode === 'forgot-password' && 'Recover Your Account'}
              </h4>
              <p className="text-muted small mb-0">
                {authMode === 'login' && 'Enter your verified official credentials below.'}
                {authMode === 'register' && 'Fill in your details and upload validation proof.'}
                {authMode === 'forgot-password' && 'We will send a password reset link to your registered email.'}
              </p>
            </div>

            {/* Error and Success Notifications */}
            {error && (
              <Alert variant="danger" className="py-2.5 px-3 small d-flex align-items-start gap-2 rounded-3 border-0 shadow-sm mb-3" style={{ background: '#FEF2F2', color: '#991B1B' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>{error}</div>
              </Alert>
            )}

            {success && (
              <Alert variant="success" className="py-2.5 px-3 small d-flex align-items-start gap-2 rounded-3 border-0 shadow-sm mb-3" style={{ background: '#F0FDF4', color: '#166534' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div>{success}</div>
              </Alert>
            )}

            {/* MODE 1: LOGIN */}
            {authMode === 'login' && (
              <Form onSubmit={handleLogin} className="auth-view-container">
                <div className="auth-input-container">
                  <Form.Label className="form-label">Email Address</Form.Label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <Form.Control
                      type="email"
                      required
                      placeholder="e.g., sk.official@lucena.gov.ph"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      disabled={loading}
                      className="auth-form-input"
                    />
                  </div>
                </div>

                <div className="auth-input-container mb-2">
                  <Form.Label className="form-label">Password</Form.Label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      disabled={loading}
                      className="auth-form-input has-toggle"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="d-flex justify-content-end mb-4">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small text-secondary fw-semibold"
                    onClick={() => switchMode('forgot-password')}
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                </div>

                <LoadingButton
                  variant="primary"
                  type="submit"
                  className="w-100 auth-submit-btn text-white"
                  loading={loading}
                  loadingText="Verifying credentials..."
                >
                  Sign In to Portal
                </LoadingButton>

                <div className="text-center mt-3 pt-2">
                  <span className="small text-muted">Don't have an approved account? </span>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small text-primary fw-bold"
                    onClick={() => switchMode('register')}
                    disabled={loading}
                  >
                    Apply here
                  </button>
                </div>
              </Form>
            )}

            {/* MODE 2: REGISTRATION (SK APPLICATION) */}
            {authMode === 'register' && (
              <Form onSubmit={handleRegistration} className="auth-view-container">
                <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                  <input
                    type="text"
                    name="company_role"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypotValue}
                    onChange={(e) => setHoneypotValue(e.target.value)}
                  />
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-md-6">
                    <div className="auth-input-container mb-2">
                      <Form.Label className="form-label">Full Name</Form.Label>
                      <div className="auth-input-wrapper">
                        <span className="auth-input-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </span>
                        <Form.Control
                          type="text"
                          required
                          placeholder="e.g., Juan Dela Cruz"
                          value={regName}
                          onChange={e => setRegName(e.target.value)}
                          disabled={loading}
                          className="auth-form-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="auth-input-container mb-2">
                      <Form.Label className="form-label">Official Email</Form.Label>
                      <div className="auth-input-wrapper">
                        <span className="auth-input-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                        </span>
                        <Form.Control
                          type="email"
                          required
                          placeholder="e.g., juan@example.com"
                          value={regEmail}
                          onChange={e => setRegEmail(e.target.value)}
                          disabled={loading}
                          className="auth-form-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="auth-input-container mb-2">
                  <Form.Label className="form-label">Designated Barangay</Form.Label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                    <Form.Select
                      required
                      value={regBarangay}
                      onChange={e => setRegBarangay(e.target.value)}
                      disabled={loading}
                      className="auth-form-select"
                    >
                      <option value="">Select your Barangay (Lucena City)...</option>
                      {BARANGAYS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </Form.Select>
                  </div>
                </div>

                {/* Validation File Dropzone */}
                <div className="mb-3">
                  <Form.Label className="form-label d-flex justify-content-between align-items-center mb-1">
                    <span>SK Validation Proof (ID / Oath Certificate)</span>
                    <span className="text-muted" style={{ fontSize: '11px' }}>PDF or Image ≤ 10MB</span>
                  </Form.Label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    style={{ display: 'none' }}
                    disabled={loading}
                  />

                  {!regFile ? (
                    <div
                      className={`auth-dropzone ${isDragging ? 'is-dragging' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => !loading && fileInputRef.current?.click()}
                    >
                      <div className="auth-dropzone-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <div className="auth-dropzone-title">
                        {isDragging ? 'Drop your document here' : 'Click to browse or drag & drop'}
                      </div>
                      <div className="auth-dropzone-subtitle">
                        Upload your SK Oath of Office, DILG Certificate, or Valid ID
                      </div>
                    </div>
                  ) : (
                    <div className="auth-file-preview-card">
                      <div className="auth-file-preview-left">
                        <div className="auth-file-preview-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                        </div>
                        <div>
                          <div className="auth-file-preview-name">{regFile.name}</div>
                          <div className="auth-file-preview-size">{formatFileSize(regFile.size)}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="auth-file-remove-btn"
                        onClick={() => {
                          setRegFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        disabled={loading}
                        aria-label="Remove uploaded file"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <LoadingButton
                  variant="primary"
                  type="submit"
                  className="w-100 auth-submit-btn text-white"
                  loading={loading}
                  loadingText="Submitting application..."
                >
                  Submit Official Application
                </LoadingButton>

                <div className="text-center mt-3 pt-1">
                  <span className="small text-muted">Already verified? </span>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small text-primary fw-bold"
                    onClick={() => switchMode('login')}
                    disabled={loading}
                  >
                    Sign In
                  </button>
                </div>
              </Form>
            )}

            {/* MODE 3: FORGOT PASSWORD */}
            {authMode === 'forgot-password' && (
              <Form onSubmit={handleForgotPassword} className="auth-view-container">
                <div className="auth-input-container mb-4">
                  <Form.Label className="form-label">Registered Account Email</Form.Label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <Form.Control
                      type="email"
                      required
                      placeholder="e.g., juan@example.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      disabled={loading}
                      className="auth-form-input"
                    />
                  </div>
                  <Form.Text className="text-muted small mt-1.5 d-block">
                    A secure one-time reset link will be sent via our transactional mail service.
                  </Form.Text>
                </div>

                <LoadingButton
                  variant="primary"
                  type="submit"
                  className="w-100 auth-submit-btn text-white mb-3"
                  loading={loading}
                  loadingText="Sending recovery link..."
                >
                  Send Recovery Link
                </LoadingButton>

                <div className="text-center">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small text-secondary fw-semibold"
                    onClick={() => switchMode('login')}
                    disabled={loading}
                  >
                    Return to Sign In
                  </button>
                </div>
              </Form>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
