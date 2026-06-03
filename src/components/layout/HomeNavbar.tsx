import React, { useState, useEffect } from 'react';
import { Container, Button, Navbar, Nav, Offcanvas } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDashboardRedirect = () => {
    setShowDrawer(false);
    navigate(role === 'admin' ? '/admin' : '/dashboard');
  };

  const handleLogout = () => {
    setShowDrawer(false);
    signOut(auth);
  };

  const handleNavClick = (targetId: string) => {
    setShowDrawer(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const navLinks = [
    { label: 'Statistics', target: 'stats' },
    { label: 'Announcements', target: 'news' },
    { label: 'Leaderboard', target: 'leaderboard' },
    { label: 'Requirements', target: 'guidelines' },
    { label: 'FAQ', target: 'faq' },
    { label: 'Support', target: 'contact' },
  ];

  return (
    <>
      <Navbar
        expand="lg"
        className={`home-navbar fixed-top ${scrolled ? 'home-navbar-glass' : 'home-navbar-transparent'}`}
      >
        <Container>
          {/* Brand */}
          <Navbar.Brand
            onClick={() => navigate('/')}
            className="d-flex align-items-center gap-2 brand-title"
            style={{ cursor: 'pointer', fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '18px' }}
          >
            <img
              src={lydoLogo}
              alt="LYDO Logo"
              height="36"
              style={{
                objectFit: 'contain',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                filter: 'drop-shadow(0 2px 6px rgba(0,110,183,0.3))'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
            />
            <span style={{ letterSpacing: '-0.03em' }}>LYDO Compliance</span>
          </Navbar.Brand>

          {/* Mobile toggle */}
          <Button
            variant="link"
            className="d-lg-none p-1 border-0"
            style={{ color: 'rgba(255,255,255,0.85)' }}
            onClick={() => setShowDrawer(true)}
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined fs-2">menu</span>
          </Button>

          {/* Desktop nav */}
          <Navbar.Collapse className="d-none d-lg-flex justify-content-end">
            <Nav className="align-items-center gap-1">
              {navLinks.map(link => (
                <span
                  key={link.target}
                  className="home-nav-link"
                  onClick={() => handleNavClick(link.target)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleNavClick(link.target)}
                >
                  {link.label}
                </span>
              ))}

              <div className="ms-3">
                {user ? (
                  <div className="d-flex align-items-center gap-3">
                    <div
                      style={{
                        width: '40px', height: '40px',
                        background: 'linear-gradient(135deg, #006EB7, #0087E0)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#FFF', fontWeight: 800, fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        boxShadow: '0 4px 16px rgba(0,110,183,0.35)',
                        fontFamily: 'var(--font-headline)',
                        border: '2px solid rgba(255,255,255,0.25)'
                      }}
                      onClick={handleDashboardRedirect}
                      title={`${userName ?? 'User'} — Go to Dashboard`}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      {getInitials(userName)}
                    </div>
                    <Button
                      onClick={handleLogout}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1.5px solid rgba(255,255,255,0.25)',
                        color: 'rgba(255,255,255,0.85)',
                        fontWeight: 600, fontSize: '13px',
                        padding: '7px 18px', borderRadius: '9999px',
                        transition: 'all 0.2s ease',
                        backdropFilter: 'blur(8px)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(237,53,36,0.15)';
                        e.currentTarget.style.borderColor = 'rgba(237,53,36,0.4)';
                        e.currentTarget.style.color = '#FFA8A8';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                      }}
                    >
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="hero-cta-primary d-flex align-items-center gap-2"
                    onClick={onLoginClick}
                    style={{ height: '40px', padding: '0 20px', fontSize: '14px' }}
                    id="navbar-access-portal"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>login</span>
                    Access Portal
                  </Button>
                )}
              </div>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Mobile Offcanvas Drawer */}
      <Offcanvas
        show={showDrawer}
        onHide={() => setShowDrawer(false)}
        placement="end"
        className="d-lg-none"
        style={{
          maxWidth: '300px',
          background: 'linear-gradient(180deg, #001B2E 0%, #00264A 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <Offcanvas.Header closeButton style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Offcanvas.Title
            className="d-flex align-items-center gap-2"
            style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, color: '#FFFFFF', fontSize: '17px' }}
          >
            <img src={lydoLogo} alt="LYDO Logo" height="28" style={{ objectFit: 'contain' }} />
            LYDO Compliance
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column justify-content-between py-4">
          <Nav className="flex-column gap-1">
            {navLinks.map(link => (
              <span
                key={link.target}
                onClick={() => handleNavClick(link.target)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleNavClick(link.target)}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: '15px',
                  color: 'rgba(255,255,255,0.75)',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'block'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                }}
              >
                {link.label}
              </span>
            ))}
          </Nav>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
            {user ? (
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center gap-3" style={{ padding: '0 4px' }}>
                  <div
                    style={{
                      width: '40px', height: '40px',
                      background: 'linear-gradient(135deg, #006EB7, #0087E0)',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#FFF', fontWeight: 800, fontSize: '14px',
                      fontFamily: 'var(--font-headline)'
                    }}
                  >
                    {getInitials(userName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '14px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userName ?? 'User'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textTransform: 'capitalize' }}>
                      {role ?? 'SK Official'}
                    </div>
                  </div>
                </div>
                <Button
                  className="hero-cta-primary d-flex align-items-center justify-content-center gap-2 w-100"
                  onClick={handleDashboardRedirect}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>dashboard</span>
                  Go to Dashboard
                </Button>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'rgba(237,53,36,0.1)',
                    border: '1.5px solid rgba(237,53,36,0.25)',
                    color: '#FFA8A8',
                    fontWeight: 600, fontSize: '14px',
                    padding: '12px 20px', borderRadius: '9999px',
                    width: '100%', cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Button
                className="hero-cta-primary d-flex align-items-center justify-content-center gap-2 w-100"
                onClick={() => { setShowDrawer(false); onLoginClick(); }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>login</span>
                Access Portal · Apply
              </Button>
            )}
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default HomeNavbar;
