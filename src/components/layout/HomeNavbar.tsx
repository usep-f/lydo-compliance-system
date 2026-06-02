import React from 'react';
import { Container, Button, Navbar, Nav } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';

import lydoLogo from '../../assets/lydo-logo.webp';

interface HomeNavbarProps {
  user: User | null;
  role: string | null;
  userName: string | null;
  onLoginClick: () => void;
}

export const HomeNavbar: React.FC<HomeNavbarProps> = ({ user, role, userName, onLoginClick }) => {
  const navigate = useNavigate();

  const handleDashboardRedirect = () => {
    if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = () => signOut(auth);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <Navbar bg="white" expand="lg" className="shadow-sm py-3 home-navbar">
      <Container>
        <Navbar.Brand 
          onClick={() => navigate('/')} 
          className="d-flex align-items-center gap-2 text-primary fw-bold fs-4 brand-title" 
          style={{ cursor: 'pointer', fontFamily: 'var(--font-headline)' }}
        >
          <img 
            src={lydoLogo} 
            alt="LYDO Logo" 
            height="32" 
            className="d-inline-block align-top transition-all"
            style={{ objectFit: 'contain' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
          <span>LYDO Compliance</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="home-navbar-nav" className="border-0 px-2" />
        
        <Navbar.Collapse id="home-navbar-nav" className="justify-content-end mt-3 mt-lg-0">
          <Nav className="align-items-center gap-3">
            <Nav.Link 
              href="#features" 
              className="text-secondary fw-semibold px-3 py-2 rounded transition-all hover-bg-light"
            >
              Features
            </Nav.Link>
            <Nav.Link 
              href="#about" 
              className="text-secondary fw-semibold px-3 py-2 rounded transition-all hover-bg-light"
            >
              About
            </Nav.Link>
            
            {user ? (
              <>
                {/* Desktop User Avatar & Logout */}
                <div className="d-none d-lg-flex align-items-center gap-3">
                  <div 
                    className="d-flex align-items-center justify-content-center bg-primary text-white rounded-circle fw-bold shadow-sm"
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      cursor: 'pointer', 
                      fontSize: '15px',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '2px solid rgba(79,70,229,0.2)',
                      userSelect: 'none'
                    }}
                    onClick={handleDashboardRedirect}
                    title={`Go to Dashboard (${userName || 'User'})`}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.08)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(79,70,229,0.3)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {getInitials(userName)}
                  </div>
                  <Button 
                    variant="outline-danger" 
                    onClick={handleLogout} 
                    className="fw-bold px-3 py-2"
                  >
                    Sign Out
                  </Button>
                </div>

                {/* Mobile User Actions (Dashboard Button & Logout) */}
                <div className="d-flex d-lg-none flex-column gap-2 w-100 mt-2">
                  <Button 
                    variant="primary" 
                    onClick={handleDashboardRedirect} 
                    className="fw-bold py-2.5 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined fs-5">dashboard</span>
                    <span>Go to Dashboard</span>
                  </Button>
                  <Button 
                    variant="outline-danger" 
                    onClick={handleLogout} 
                    className="fw-bold py-2.5 w-100"
                  >
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <Button 
                variant="primary" 
                onClick={onLoginClick} 
                className="fw-bold px-4 py-2 mt-2 mt-lg-0 d-flex align-items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined fs-5">login</span>
                <span>Sign In / Apply</span>
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default HomeNavbar;
