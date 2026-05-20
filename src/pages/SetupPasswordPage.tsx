import { useEffect, useState } from 'react';
import { Container, Card, Alert } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PasswordSetupForm from '../components/auth/PasswordSetupForm';

export default function SetupPasswordPage() {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');
  const navigate = useNavigate();
  const [isValidCode, setIsValidCode] = useState(true);

  useEffect(() => {
    if (!oobCode) {
      setIsValidCode(false);
    }
  }, [oobCode]);

  const handleSuccess = () => {
    // User is now automatically logged in, redirect directly to dashboard
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-vh-100 bg-light d-flex flex-column justify-content-center py-5">
      <Container>
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-5">
            <div className="text-center mb-4">
              <h2 className="text-primary fw-bold headline-text" style={{ letterSpacing: '-0.02em' }}>
                Lydo Compliance
              </h2>
              <p className="text-muted">Account Setup</p>
            </div>

            <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
              <Card.Body className="p-4 p-md-5">
                <h3 className="h5 fw-bold mb-4 text-center">Set Your Password</h3>
                
                {!isValidCode ? (
                  <Alert variant="danger" className="text-center">
                    Invalid or missing setup link. Please check your email for the correct link or contact support.
                  </Alert>
                ) : (
                  <PasswordSetupForm oobCode={oobCode!} onSuccess={handleSuccess} />
                )}
              </Card.Body>
            </Card>
            
            <div className="text-center mt-4">
              <a href="/" className="text-secondary text-decoration-none small fw-semibold">
                Return to Homepage
              </a>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
