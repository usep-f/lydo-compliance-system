import { Container, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import lydoLogo from '../assets/lydo-logo.webp';

export default function RegistrationSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="min-vh-100 bg-light d-flex flex-column justify-content-center py-5">
      <Container>
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
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
            </div>

            <Card className="border-0 shadow-sm text-center" style={{ borderRadius: '12px' }}>
              <Card.Body className="p-4 p-md-5">
                <div className="mb-4">
                  <div className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 rounded-circle" style={{ width: '80px', height: '80px' }}>
                    <span className="material-symbols-outlined text-success" style={{ fontSize: '40px' }}>
                      check_circle
                    </span>
                  </div>
                </div>
                
                <h3 className="h4 fw-bold mb-3">Congratulations!</h3>
                <p className="text-muted mb-4 fs-5">
                  Your password has been successfully set. Your account is now fully registered and secure.
                </p>
                
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="px-5 rounded-pill shadow-sm"
                  onClick={() => navigate('/')}
                >
                  Return to Homepage
                </Button>
              </Card.Body>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
