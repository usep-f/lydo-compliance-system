import { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { auth, db, storage } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

const BARANGAYS = [
  "Barangay 1 (Poblacion)", "Barangay 2 (Poblacion)", "Barangay 3 (Poblacion)", 
  "Barangay 4 (Poblacion)", "Barangay 5 (Poblacion)", "Barangay 6 (Poblacion)", 
  "Barangay 7 (Poblacion)", "Barangay 8 (Poblacion)", "Barangay 9 (Poblacion)", 
  "Barangay 10 (Poblacion)", "Barangay 11 (Poblacion)", "Barra", "Bocohan", 
  "Cotta", "Dalahican", "Domoit", "Gulang-Gulang", "Ibabang Dupay", 
  "Ibabang Iyam", "Ibabang Talim", "Ilayang Dupay", "Ilayang Iyam", 
  "Ilayang Talim", "Isabang", "Market View", "Mayao Castillo", "Mayao Crossing", 
  "Mayao Kanluran", "Mayao Parada", "Mayao Silangan", "Ransohan", "Salinas", 
  "Talao-Talao"
];

export default function AuthPage() {
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
      // App.tsx routing will handle the redirect upon successful auth
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
    <Container className="d-flex align-items-center justify-content-center min-vh-100 py-5">
      <div className="w-100" style={{ maxWidth: isLoginMode ? '400px' : '600px' }}>
        <Card className="shadow-lg border-0 rounded-lg">
          <Card.Header className="bg-primary text-white text-center py-4">
            <h3 className="mb-0 fw-bold">Lydo Compliance System</h3>
            <p className="mb-0 mt-2 text-white-50">
              {isLoginMode ? 'Sign in to your account' : 'Apply for an SK Official Account'}
            </p>
          </Card.Header>
          <Card.Body className="p-4 p-md-5">
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            {isLoginMode ? (
              <Form onSubmit={handleLogin}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                  />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100 py-2" disabled={loading}>
                  {loading ? <Spinner animation="border" size="sm" /> : 'Sign In'}
                </Button>
                <div className="text-center mt-4">
                  <Button variant="link" onClick={() => setIsLoginMode(false)} className="text-decoration-none">
                    Don't have an account? Apply here
                  </Button>
                </div>
              </Form>
            ) : (
              <Form onSubmit={handleRegistration}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <Form.Group>
                      <Form.Label>Full Name</Form.Label>
                      <Form.Control
                        type="text"
                        required
                        placeholder="Juan Dela Cruz"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6 mb-3">
                    <Form.Group>
                      <Form.Label>Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        required
                        placeholder="juan@example.com"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                      />
                    </Form.Group>
                  </div>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label>Barangay</Form.Label>
                  <Form.Select required value={regBarangay} onChange={e => setRegBarangay(e.target.value)}>
                    <option value="">Select your barangay...</option>
                    {BARANGAYS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>SK Validation Document (PDF or Image)</Form.Label>
                  <Form.Control
                    type="file"
                    required
                    accept=".pdf,image/*"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegFile(e.target.files?.[0] || null)}
                  />
                  <Form.Text className="text-muted">
                    Please upload a valid ID or certificate proving your SK Official status.
                  </Form.Text>
                </Form.Group>

                <Button variant="primary" type="submit" className="w-100 py-2" disabled={loading}>
                  {loading ? <Spinner animation="border" size="sm" /> : 'Submit Application'}
                </Button>
                <div className="text-center mt-4">
                  <Button variant="link" onClick={() => setIsLoginMode(true)} className="text-decoration-none">
                    Already approved? Sign in
                  </Button>
                </div>
              </Form>
            )}
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
}
