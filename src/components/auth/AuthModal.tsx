import React, { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { auth, db, storage, functions } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { BARANGAYS } from '../../constants/barangays';
import FormField from '../common/FormField';
import LoadingButton from '../common/LoadingButton';
import lydoLogo from '../../assets/lydo-logo.webp';

interface AuthModalProps {
  show: boolean;
  onHide: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot-password';

export default function AuthModal({ show, onHide }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBarangay, setRegBarangay] = useState('');
  const [regFile, setRegFile] = useState<File | null>(null);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      // Auth success - App-level state will handle redirection. Close modal.
      onHide();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
      setLoading(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!regFile) {
      setError("Please upload your SK validation document.");
      return;
    }
    if (!regBarangay) {
      setError("Please select your barangay.");
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
          setError("This email address is already in use by an approved SK Official.");
        } else if (reason === 'pending') {
          setError("This email address is currently associated with a pending registration application.");
        } else {
          setError("This email address is not available for registration.");
        }
        setLoading(false);
        return;
      }

      // 2. Upload File to Storage
      const fileExt = regFile.name.split('.').pop();
      const storagePath = `temp_proofs/${Date.now()}_${regName.replace(/\s+/g, '_')}.${fileExt}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, regFile);

      // 3. Save Application to pending_users collection using a deterministic ID
      // derived from the sanitized email address to guarantee uniqueness.
      const cleanEmail = regEmail.trim().toLowerCase();
      const docId = cleanEmail.replace(/[^a-zA-Z0-9.\-_]/g, '_');

      await setDoc(doc(db, 'pending_users', docId), {
        fullName: regName,
        email: cleanEmail,
        barangay: regBarangay,
        proofStoragePath: storagePath,
        submittedAt: serverTimestamp()
      });

      setSuccess("Your application has been submitted successfully! You will receive an email once an administrator approves your account.");
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
      setError("Please enter your email address.");
      return;
    }
    
    setLoading(true);
    try {
      const requestPasswordReset = httpsCallable(functions, 'requestPasswordReset');
      await requestPasswordReset({ email: forgotEmail });
      
      setSuccess("If an account exists, a password reset link has been sent to your email.");
      setForgotEmail('');
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={loading ? () => {} : onHide} 
      centered 
      backdrop="static"
      keyboard={!loading}
      size={authMode === 'register' ? 'lg' : 'sm'}
      dialogClassName="auth-modal-dialog"
      contentClassName="border-0 shadow-lg"
    >
      <Modal.Header closeButton={!loading} className="border-0 pb-0 pt-3 px-4 px-md-5" />
      
      <Modal.Body className="px-4 px-md-5 pb-5 pt-0">
        <div className="text-center mb-4">
          <img 
            src={lydoLogo} 
            alt="LYDO Logo" 
            style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '12px' }} 
            className="transition-all"
          />
          <h3 className="mb-1 text-primary fw-bold headline-text" style={{ letterSpacing: '-0.02em' }}>
            {authMode === 'forgot-password' ? 'Reset Password' : 'Lydo Compliance'}
          </h3>
          <p className="text-muted small mb-0 mt-2">
            {authMode === 'login' && 'Sign in to your account'}
            {authMode === 'register' && 'Apply for an SK Official Account'}
            {authMode === 'forgot-password' && 'Enter your email to receive a recovery link'}
          </p>
        </div>
        {error && <Alert variant="danger" className="py-2.5 small">{error}</Alert>}
        {success && <Alert variant="success" className="py-2.5 small">{success}</Alert>}

        {authMode === 'login' && (
          <Form onSubmit={handleLogin}>
            <FormField
              label="Email Address"
              type="email"
              required
              placeholder="Enter your email"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              disabled={loading}
            />
            <FormField
              label="Password"
              type="password"
              required
              placeholder="Enter your password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              className="mb-2"
              disabled={loading}
            />
            <div className="d-flex justify-content-end mb-4">
              <Button 
                variant="link" 
                className="p-0 text-decoration-none small text-secondary" 
                onClick={() => { setAuthMode('forgot-password'); setError(''); setSuccess(''); }}
                disabled={loading}
              >
                Forgot password?
              </Button>
            </div>
            <LoadingButton variant="primary" type="submit" className="w-100 py-2 fw-semibold shadow-sm" loading={loading}>
              Sign In
            </LoadingButton>
            <div className="text-center mt-4">
              <Button variant="link" onClick={() => { setAuthMode('register'); setError(''); setSuccess(''); }} className="text-decoration-none small text-secondary" disabled={loading}>
                Don't have an account? Apply here
              </Button>
            </div>
          </Form>
        )}
        
        {authMode === 'register' && (
          <Form onSubmit={handleRegistration}>
            <div className="row">
              <div className="col-md-6">
                <FormField
                  label="Full Name"
                  required
                  placeholder="Juan Dela Cruz"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="col-md-6">
                <FormField
                  label="Email Address"
                  type="email"
                  required
                  placeholder="juan@example.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="form-label">Barangay</Form.Label>
              <Form.Select required value={regBarangay} onChange={e => setRegBarangay(e.target.value)} className="form-select" disabled={loading}>
                <option value="">Select your barangay...</option>
                {BARANGAYS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <FormField
              label="SK Validation Document (PDF or Image)"
              type="file"
              required
              accept=".pdf,image/*"
              onChange={(e) => setRegFile((e.target as HTMLInputElement).files?.[0] || null)}
              helpText="Upload a valid ID or certificate proving your SK Official status."
              className="mb-4"
              disabled={loading}
            />

            <LoadingButton variant="primary" type="submit" className="w-100 py-2 fw-semibold shadow-sm" loading={loading}>
              Submit Application
            </LoadingButton>
            <div className="text-center mt-4">
              <Button variant="link" onClick={() => { setAuthMode('login'); setError(''); setSuccess(''); }} className="text-decoration-none small text-secondary" disabled={loading}>
                Already approved? Sign in
              </Button>
            </div>
          </Form>
        )}
        
        {authMode === 'forgot-password' && (
          <Form onSubmit={handleForgotPassword}>
            <FormField
              label="Email Address"
              type="email"
              required
              placeholder="Enter your registered email"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
              className="mb-4"
              disabled={loading}
            />
            <LoadingButton variant="primary" type="submit" className="w-100 py-2 fw-semibold shadow-sm" loading={loading}>
              Send Reset Link
            </LoadingButton>
            <div className="text-center mt-4">
              <Button variant="link" onClick={() => { setAuthMode('login'); setError(''); setSuccess(''); }} className="text-decoration-none small text-secondary" disabled={loading}>
                Back to Sign In
              </Button>
            </div>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
}
