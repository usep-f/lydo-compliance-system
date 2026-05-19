import React, { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { auth, db, storage } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { BARANGAYS } from '../../constants/barangays';
import FormField from '../common/FormField';
import LoadingButton from '../common/LoadingButton';

interface AuthModalProps {
  show: boolean;
  onHide: () => void;
}

export default function AuthModal({ show, onHide }: AuthModalProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
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
      // 1. Upload File to Storage
      const fileExt = regFile.name.split('.').pop();
      const storagePath = `temp_proofs/${Date.now()}_${regName.replace(/\s+/g, '_')}.${fileExt}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, regFile);

      // 2. Save Application to pending_users collection
      await addDoc(collection(db, 'pending_users'), {
        fullName: regName,
        email: regEmail,
        barangay: regBarangay,
        proofStoragePath: storagePath,
        status: 'pending',
        submittedAt: serverTimestamp()
      });

      setSuccess("Your application has been submitted successfully! You will receive an email once an administrator approves your account.");
      setRegName('');
      setRegEmail('');
      setRegBarangay('');
      setRegFile(null);
      setIsLoginMode(true);
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
      size={isLoginMode ? 'sm' : 'lg'}
      dialogClassName="auth-modal-dialog"
      contentClassName="border-0 shadow-lg"
    >
      <Modal.Header closeButton={!loading} className="border-0 pb-0 pt-4 px-4 px-md-5">
        <Modal.Title className="w-100 text-center">
          <h3 className="mb-1 text-primary fw-bold headline-text" style={{ letterSpacing: '-0.02em' }}>
            Lydo Compliance
          </h3>
          <p className="text-muted small mb-0 mt-2">
            {isLoginMode ? 'Sign in to your account' : 'Apply for an SK Official Account'}
          </p>
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="px-4 px-md-5 pb-5 pt-3">
        {error && <Alert variant="danger" className="py-2.5 small">{error}</Alert>}
        {success && <Alert variant="success" className="py-2.5 small">{success}</Alert>}

        {isLoginMode ? (
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
              className="mb-4"
              disabled={loading}
            />
            <LoadingButton variant="primary" type="submit" className="w-100 py-2 fw-semibold shadow-sm" loading={loading}>
              Sign In
            </LoadingButton>
            <div className="text-center mt-4">
              <Button variant="link" onClick={() => { setIsLoginMode(false); setError(''); setSuccess(''); }} className="text-decoration-none small text-secondary" disabled={loading}>
                Don't have an account? Apply here
              </Button>
            </div>
          </Form>
        ) : (
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
              value=""
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegFile(e.target.files?.[0] || null)}
              helpText="Upload a valid ID or certificate proving your SK Official status."
              className="mb-4"
              disabled={loading}
            />

            <LoadingButton variant="primary" type="submit" className="w-100 py-2 fw-semibold shadow-sm" loading={loading}>
              Submit Application
            </LoadingButton>
            <div className="text-center mt-4">
              <Button variant="link" onClick={() => { setIsLoginMode(true); setError(''); setSuccess(''); }} className="text-decoration-none small text-secondary" disabled={loading}>
                Already approved? Sign in
              </Button>
            </div>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
}
