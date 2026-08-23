import React, { useState, useEffect } from 'react';
import { Alert, Form } from 'react-bootstrap';
import { auth } from '../../firebase';
import { confirmPasswordReset, verifyPasswordResetCode, signInWithEmailAndPassword } from 'firebase/auth';
import LoadingButton from '../common/LoadingButton';
import { validatePassword } from '../../utils/passwordValidation';

interface PasswordSetupFormProps {
  oobCode: string;
  onSuccess: () => void;
  mode?: 'setup' | 'reset';
}

export default function PasswordSetupForm({ oobCode, onSuccess, mode = 'setup' }: PasswordSetupFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setVerifiedEmail(email);
        setVerifying(false);
      })
      .catch((err) => {
        console.error(err);
        setVerifying(false);
        setError('This security link has expired or is invalid. Please request a new link.');
      });
  }, [oobCode]);

  // Real-time password checks
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError(validation.errors.join(' '));
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    if (!verifiedEmail) {
      setError('Cannot set password for an unverified session.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      await signInWithEmailAndPassword(auth, verifiedEmail, password);
      onSuccess();
    } catch (err: unknown) {
      const errorObj = err as Error & { code?: string };
      if (errorObj.code === 'auth/invalid-action-code') {
        setError('This link has expired or has already been used. Please request a new one.');
      } else {
        setError(errorObj.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary mb-3" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
          <span className="visually-hidden">Verifying link...</span>
        </div>
        <div className="text-muted small fw-semibold">Verifying secure authentication link...</div>
      </div>
    );
  }

  if (!verifiedEmail) {
    return (
      <Alert variant="danger" className="text-center py-3 px-4 rounded-3 border-0 shadow-sm" style={{ background: '#FEF2F2', color: '#991B1B' }}>
        <div className="fw-bold mb-1">Invalid or Expired Link</div>
        <div className="small">{error}</div>
      </Alert>
    );
  }

  return (
    <Form onSubmit={handleSubmit}>
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
      
      {/* Verified Email Pill */}
      <div className="mb-4 text-center p-3 rounded-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <div className="text-muted small mb-1">
          {mode === 'reset' ? 'Resetting password for account:' : 'Configuring password for account:'}
        </div>
        <div className="fw-bold text-primary" style={{ letterSpacing: '0.01em' }}>
          {verifiedEmail}
        </div>
      </div>
      
      {/* New Password Input */}
      <div className="auth-input-container mb-3">
        <Form.Label className="form-label">New Password</Form.Label>
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
            placeholder="Enter your new password"
            value={password}
            onChange={e => setPassword(e.target.value)}
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
      
      {/* Confirm Password Input */}
      <div className="auth-input-container mb-3">
        <Form.Label className="form-label">Confirm New Password</Form.Label>
        <div className="auth-input-wrapper">
          <span className="auth-input-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <Form.Control
            type={showConfirmPassword ? 'text' : 'password'}
            required
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="auth-form-input has-toggle"
          />
          <button
            type="button"
            className="auth-password-toggle-btn"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            tabIndex={-1}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? (
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

      {/* Password Requirements Checklist */}
      <div className="p-3 mb-4 rounded-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <div className="small fw-bold text-dark mb-2">Password Requirements:</div>
        <div className="d-flex flex-column gap-1.5" style={{ fontSize: '12px' }}>
          <div className={`d-flex align-items-center gap-2 ${hasMinLength ? 'text-success fw-semibold' : 'text-muted'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hasMinLength ? '#16A34A' : '#94A3B8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {hasMinLength ? <polyline points="20 6 9 17 4 12" /> : <circle cx="12" cy="12" r="10" />}
            </svg>
            <span>At least 8 characters</span>
          </div>

          <div className={`d-flex align-items-center gap-2 ${hasUpper && hasLower ? 'text-success fw-semibold' : 'text-muted'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hasUpper && hasLower ? '#16A34A' : '#94A3B8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {hasUpper && hasLower ? <polyline points="20 6 9 17 4 12" /> : <circle cx="12" cy="12" r="10" />}
            </svg>
            <span>Uppercase & lowercase letters</span>
          </div>

          <div className={`d-flex align-items-center gap-2 ${hasNumber && hasSpecial ? 'text-success fw-semibold' : 'text-muted'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hasNumber && hasSpecial ? '#16A34A' : '#94A3B8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {hasNumber && hasSpecial ? <polyline points="20 6 9 17 4 12" /> : <circle cx="12" cy="12" r="10" />}
            </svg>
            <span>At least one number & special character</span>
          </div>

          {confirmPassword.length > 0 && (
            <div className={`d-flex align-items-center gap-2 ${passwordsMatch ? 'text-success fw-semibold' : 'text-danger fw-semibold'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={passwordsMatch ? '#16A34A' : '#DC2626'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {passwordsMatch ? <polyline points="20 6 9 17 4 12" /> : <line x1="18" y1="6" x2="6" y2="18" />}
              </svg>
              <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
            </div>
          )}
        </div>
      </div>
      
      <LoadingButton 
        variant="primary" 
        type="submit" 
        className="w-100 auth-submit-btn text-white py-2" 
        loading={loading}
        loadingText="Saving & signing in..."
      >
        {mode === 'reset' ? 'Update Password & Access Portal' : 'Activate Account & Access Portal'}
      </LoadingButton>
    </Form>
  );
}
