import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import HomeNavbar from '../components/layout/HomeNavbar';
import AuthModal from '../components/auth/AuthModal';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setRole(userData.role || 'user');
            setUserName(userData.fullName || currentUser.displayName || 'User');
          } else {
            setRole('user');
            setUserName(currentUser.displayName || 'User');
          }
        } catch (error) {
          console.error("Error fetching user data on homepage:", error);
          setRole('user');
          setUserName(currentUser.displayName || 'User');
        }
      } else {
        setUser(null);
        setRole(null);
        setUserName(null);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="home-layout min-vh-100 bg-light d-flex flex-column">
      {/* Header / Public Navbar */}
      <HomeNavbar 
        user={user} 
        role={role} 
        userName={userName}
        onLoginClick={() => setShowAuthModal(true)} 
      />

      {/* Hero Section */}
      <div className="hero-section py-5 d-flex align-items-center position-relative overflow-hidden flex-grow-1" style={{ minHeight: '80vh', background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)' }}>
        {/* Abstract decorative background shapes */}
        <div className="position-absolute" style={{ width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, rgba(79,70,229,0) 70%)', top: '-100px', right: '-100px' }}></div>
        <div className="position-absolute" style={{ width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0) 70%)', bottom: '-50px', left: '-50px' }}></div>
        
        <Container className="position-relative py-4">
          <Row className="align-items-center">
            <Col lg={6} className="text-center text-lg-start mb-5 mb-lg-0">
              <div className="overline-text text-primary fw-bold mb-3 tracking-wider" style={{ letterSpacing: '0.15em' }}>LOCAL YOUTH DEVELOPMENT OFFICE</div>
              <h1 className="display-text text-dark fw-extrabold mb-4" style={{ fontFamily: 'var(--font-headline)', fontSize: '3.2rem', lineHeight: '1.15', letterSpacing: '-0.02em' }}>
                Unified Governance & <span className="text-primary">Compliance Portal</span>
              </h1>
              <p className="body-large text-secondary mb-4" style={{ fontSize: '1.15rem', color: '#4B5563' }}>
                Secure, transparent, and streamlined application validation for Sangguniang Kabataan (SK) Officials. Empowering youth leaders with automated registration, vetting, and compliance tracking.
              </p>
              <div className="d-flex flex-wrap justify-content-center justify-content-lg-start gap-3">
                {user ? (
                  <Button 
                    variant="primary" 
                    size="lg"
                    onClick={() => {
                      if (role === 'admin') navigate('/admin');
                      else navigate('/dashboard');
                    }}
                    className="fw-bold px-4 shadow-sm"
                  >
                    Go to Portal Dashboard
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="primary" 
                      size="lg"
                      onClick={() => setShowAuthModal(true)}
                      className="fw-bold px-4 shadow-sm"
                    >
                      Apply / Sign In
                    </Button>
                    <Button 
                      variant="outline-primary" 
                      size="lg"
                      href="#features"
                      className="fw-bold px-4"
                    >
                      Explore Features
                    </Button>
                  </>
                )}
              </div>
            </Col>
            <Col lg={6} className="d-flex justify-content-center">
              <div className="position-relative w-100" style={{ maxWidth: '480px' }}>
                {/* Floating glassmorphic card for aesthetic punch */}
                <div className="card border-0 shadow-lg p-4 rounded-4 bg-white bg-opacity-75 backdrop-blur" style={{ border: '1px solid rgba(255,255,255,0.4) !important', transform: 'rotate(-1.5deg)' }}>
                  <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="bg-primary text-white p-3 rounded-3 d-inline-flex" style={{ borderRadius: '12px !important' }}>
                      <span className="material-symbols-outlined fs-2">security</span>
                    </div>
                    <div>
                      <h4 className="m-0 fw-bold" style={{ fontSize: '1.25rem' }}>Official Registration</h4>
                      <p className="text-muted small mb-0">LYDO Credentialing Flow</p>
                    </div>
                  </div>
                  
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-center gap-3 p-3 rounded-3 bg-white shadow-sm border border-light">
                      <span className="material-symbols-outlined text-success fs-4">verified</span>
                      <div className="flex-grow-1">
                        <div className="fw-semibold text-dark small" style={{ fontSize: '0.85rem' }}>Document Submission</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>Upload your SK validation documents safely</div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-3 p-3 rounded-3 bg-white shadow-sm border border-light">
                      <span className="material-symbols-outlined text-warning fs-4">pending_actions</span>
                      <div className="flex-grow-1">
                        <div className="fw-semibold text-dark small" style={{ fontSize: '0.85rem' }}>Admin Review & Vetting</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>LYDO administrators review your credentials</div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-3 p-3 rounded-3 bg-white shadow-sm border border-light">
                      <span className="material-symbols-outlined text-primary fs-4">mail</span>
                      <div className="flex-grow-1">
                        <div className="fw-semibold text-dark small" style={{ fontSize: '0.85rem' }}>Instant Notification</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>Receive approval email once vetted by LYDO</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Features Section */}
      <div id="features" className="py-5 bg-white border-top border-light">
        <Container className="py-5">
          <div className="text-center mb-5">
            <div className="overline-text text-primary fw-bold mb-2">SYSTEM CAPABILITIES</div>
            <h2 className="headline-text fw-bold text-dark mb-3">Designed for Speed and Accountability</h2>
            <p className="text-muted mx-auto" style={{ maxWidth: '600px', fontSize: '1.05rem' }}>
              The LYDO Compliance System automates and modernizes the vetting of youth officials to ensure compliance, integrity, and operational speed.
            </p>
          </div>

          <Row className="g-4">
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm p-4 text-center">
                <Card.Body className="p-0">
                  <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle d-inline-flex mb-4" style={{ width: '60px', height: '60px', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined fs-2">cloud_upload</span>
                  </div>
                  <h4 className="fw-bold mb-3" style={{ fontSize: '1.2rem' }}>Easy Application</h4>
                  <p className="text-secondary small">
                    SK Officials can upload validation files and input profiles securely within seconds. No physical paperwork required.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm p-4 text-center">
                <Card.Body className="p-0">
                  <div className="bg-secondary bg-opacity-10 text-secondary p-3 rounded-circle d-inline-flex mb-4" style={{ width: '60px', height: '60px', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined fs-2">verified_user</span>
                  </div>
                  <h4 className="fw-bold mb-3" style={{ fontSize: '1.2rem' }}>Secure Admin Vetting</h4>
                  <p className="text-secondary small">
                    Admins can view uploaded files, verify details in a dual-pane secure interface, and approve or deny with explicit feedback.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm p-4 text-center">
                <Card.Body className="p-0">
                  <div className="bg-success bg-opacity-10 text-success p-3 rounded-circle d-inline-flex mb-4" style={{ width: '60px', height: '60px', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined fs-2">outgoing_mail</span>
                  </div>
                  <h4 className="fw-bold mb-3" style={{ fontSize: '1.2rem' }}>Transactional Emails</h4>
                  <p className="text-secondary small">
                    Integrates with high-delivery email services to send real-time confirmation, approval passwords, and rejection warnings.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Info / About Section */}
      <div id="about" className="py-5 bg-light border-top border-light">
        <Container className="py-5">
          <Row className="align-items-center">
            <Col lg={6} className="mb-4 mb-lg-0">
              <div className="bg-primary text-white p-4 rounded-4 shadow-sm" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', borderRadius: '16px' }}>
                <span className="material-symbols-outlined fs-1 mb-3">info</span>
                <h3 className="text-white fw-bold mb-3">Why Compliance Matters</h3>
                <p className="text-white text-opacity-90 mb-4" style={{ fontSize: '0.98rem' }}>
                  Ensuring all registered youth leaders are properly credentialed and vetted is paramount for financial audits, project compliance, and proper representation at the Local Youth Development Council.
                </p>
                <div className="d-flex align-items-center gap-4">
                  <div className="d-flex flex-column">
                    <span className="fs-3 fw-bold text-white">100%</span>
                    <span className="small text-white text-opacity-75">Digital Vetting</span>
                  </div>
                  <div className="border-end h-100 py-3" style={{ borderColor: 'rgba(255,255,255,0.2)' }}></div>
                  <div className="d-flex flex-column">
                    <span className="fs-3 fw-bold text-white">Zero</span>
                    <span className="small text-white text-opacity-75">Paper Waste</span>
                  </div>
                </div>
              </div>
            </Col>
            <Col lg={6} className="ps-lg-5">
              <div className="overline-text text-primary fw-bold mb-2">ABOUT THE SYSTEM</div>
              <h2 className="headline-text fw-bold text-dark mb-4" style={{ fontSize: '2.2rem' }}>Empowering the SK Leadership</h2>
              <p className="body-text text-secondary mb-4">
                The Local Youth Development Office (LYDO) is tasked with assisting and registering all Sangguniang Kabataan (SK) and youth organizations. This portal serves as a unified channel to automate registrations, maintain digital verification histories, and assure compliant records.
              </p>
              <div className="d-flex align-items-center gap-2">
                <span className="material-symbols-outlined text-primary">check_circle</span>
                <span className="fw-semibold text-dark">Complies with Local Government Youth Codes</span>
              </div>
              <div className="d-flex align-items-center gap-2 mt-2">
                <span className="material-symbols-outlined text-primary">check_circle</span>
                <span className="fw-semibold text-dark">Encrypted Data & Secure Cloud Storage</span>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Footer */}
      <footer className="py-4 bg-white border-top border-light text-center mt-auto">
        <Container>
          <p className="text-muted small mb-0">
            &copy; {new Date().getFullYear()} LYDO Compliance Portal. Sangguniang Kabataan Office. All rights reserved.
          </p>
        </Container>
      </footer>

      {/* Auth Modal Component */}
      <AuthModal 
        show={showAuthModal} 
        onHide={() => setShowAuthModal(false)} 
      />
    </div>
  );
}
