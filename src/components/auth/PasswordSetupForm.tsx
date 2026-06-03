import React, { useState, useEffect } from 'react';
import { Alert, Form } from 'react-bootstrap';
import { auth } from '../../firebase';
import { confirmPasswordReset, verifyPasswordResetCode, signInWithEmailAndPassword } from 'firebase/auth';
import FormField from '../common/FormField';
import LoadingButton from '../common/LoadingButton';
import { validatePassword } from '../../utils/passwordValidation';

interface PasswordSetupFormProps {
  oobCode: string;
  onSuccess: () => void;
}

export default function PasswordSetupForm({ oobCode, onSuccess }: PasswordSetupFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
        setError('This link has expired or is invalid. Please request a new one.');
      });
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError(validation.errors.join(' '));
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!verifiedEmail) {
      setError('Cannot set password for an unverified session.');
      return;
    }

    setLoading(true);
    try {
      // 1. Confirm the new password
      await confirmPasswordReset(auth, oobCode, password);
      // 2. Automatically sign them in immediately after
      await signInWithEmailAndPassword(auth, verifiedEmail, password);
      onSuccess();
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      if (error.code === 'auth/invalid-action-code') {
        setError('This link has expired or has already been used. Please request a new one.');
      } else {
        setError(error.message || 'Failed to set password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return <div className="text-center py-4 text-muted">Verifying your secure link...</div>;
  }

  if (!verifiedEmail) {
    return <Alert variant="danger" className="text-center">{error}</Alert>;
  }

  return (
    <Form onSubmit={handleSubmit}>
      {error && <Alert variant="danger" className="py-2.5 small">{error}</Alert>}
      
      <div className="mb-4 text-center">
        <div className="text-muted small mb-1">Setting password for:</div>
        <div className="fw-semibold text-primary">{verifiedEmail}</div>
      </div>
      
      <FormField
        label="New Password"
        type="password"
        required
        placeholder="Enter your new password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        disabled={loading}
      />
      
      <FormField
        label="Confirm Password"
        type="password"
        required
        placeholder="Re-enter your new password"
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
        className="mb-4"
        disabled={loading}
      />
      
      <LoadingButton 
        variant="primary" 
        type="submit" 
        className="w-100 py-2 fw-semibold shadow-sm" 
        loading={loading}
      >
        Save Password & Sign In
      </LoadingButton>
    </Form>
  );
}
