import { useEffect } from 'react';
import { Container, Card, Alert } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PasswordSetupForm from '../components/auth/PasswordSetupForm';
import lydoLogo from '../assets/lydo-logo.webp';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "LYDO | Reset Password";
  }, []);
  
  const oobCode = searchParams.get('oobCode');
  const isValidCode = !!oobCode;

  const handleSuccess = () => {
    // Both setup and reset auto-authenticate the user in Firebase Auth.
    // Navigating back to home will let the App.tsx auth listener route them appropriately
    // based on their role (`/dashboard` or `/admin`).
    navigate('/');
  };

  return (
    <div className="min-vh-100 bg-light d-flex flex-column justify-content-center py-5">
      <Container>
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-5">
            <div className="text-center mb-4">
              <img 
                src={lydoLogo} 
                alt="LYDO Logo" 
                style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '12px' }} 
                className="transition-all"
              />
              <h2 className="text-primary fw-bold headline-text" style={{ letterSpacing: '-0.02em' }}>
                Lydo Compliance
              </h2>
              <p className="text-muted">Account Recovery</p>
            </div>

            <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <Card.Body className="p-4 p-md-5">
                <h3 className="h5 fw-bold mb-4 text-center">Reset Your Password</h3>
                
                {!isValidCode ? (
                  <Alert variant="danger" className="text-center">
                    Invalid or missing reset link. Please check your email for the correct link or request a new one.
                  </Alert>
                ) : (
                  <PasswordSetupForm oobCode={oobCode!} onSuccess={handleSuccess} mode="reset" />
                )}
              </Card.Body>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
