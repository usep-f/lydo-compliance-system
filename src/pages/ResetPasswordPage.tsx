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
    navigate('/');
  };

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center py-5" style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #EDF2F7 100%)' }}>
      <Container>
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-5">
            <div className="text-center mb-4">
              <div 
                className="d-inline-flex align-items-center justify-content-center p-3 rounded-4 bg-white shadow-sm mb-3"
                style={{ border: '1px solid #E2E8F0' }}
              >
                <img 
                  src={lydoLogo} 
                  alt="LYDO Logo" 
                  style={{ width: '52px', height: '52px', objectFit: 'contain' }} 
                />
              </div>
              <h2 className="text-primary fw-bold headline-text mb-1" style={{ letterSpacing: '-0.02em' }}>
                Lydo Compliance
              </h2>
              <p className="text-muted small">Account Recovery & Credential Reset</p>
            </div>

            <Card className="border-0 shadow-lg rounded-4 overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <h3 className="h5 fw-bold text-dark mb-1">Reset Your Password</h3>
                  <p className="text-muted small mb-0">Enter a new secure password for your LYDO portal account.</p>
                </div>
                
                {!isValidCode ? (
                  <Alert variant="danger" className="text-center py-3 px-4 rounded-3 border-0 shadow-sm" style={{ background: '#FEF2F2', color: '#991B1B' }}>
                    <div className="fw-bold mb-1">Invalid or Missing Reset Link</div>
                    <div className="small">Please check the recovery email sent to your inbox or request a new reset link.</div>
                  </Alert>
                ) : (
                  <PasswordSetupForm oobCode={oobCode!} onSuccess={handleSuccess} mode="reset" />
                )}
              </Card.Body>
            </Card>

            <div className="text-center mt-4 text-muted" style={{ fontSize: '11.5px' }}>
              Republic of the Philippines • City Government of Lucena
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
