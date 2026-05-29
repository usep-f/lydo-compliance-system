import React, { useState, useEffect } from 'react';
import { Container, Button, Navbar, Nav } from 'react-bootstrap';
import { auth, db } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export interface NavigationSection {
  id: string;
  label: string;
  isImplemented: boolean;
  icon: string;
}

interface DashboardNavbarProps {
  title: string;
  activeSection?: string;
  onSectionSelect?: (section: string) => void;
  sections?: NavigationSection[];
}

const DEFAULT_SECTIONS: NavigationSection[] = [
  { id: 'home', label: 'Home', isImplemented: false, icon: 'home' },
  { id: 'applicants', label: 'Applicants', isImplemented: true, icon: 'badge' },
  { id: 'users', label: 'Users', isImplemented: true, icon: 'group' },
  { id: 'submissions', label: 'Submissions', isImplemented: true, icon: 'description' },
  { id: 'history', label: 'History', isImplemented: true, icon: 'history' },
  { id: 'analytics', label: 'Analytics', isImplemented: true, icon: 'bar_chart' },
  { id: 'settings', label: 'User Settings', isImplemented: true, icon: 'settings' },
];

const DashboardNavbar: React.FC<DashboardNavbarProps> = ({
  title,
  activeSection = 'applicants',
  onSectionSelect,
  sections = DEFAULT_SECTIONS
}) => {
  const [expanded, setExpanded] = useState(false);
  const [adminName, setAdminName] = useState<string>('Loading...');

  const handleLogout = () => signOut(auth);

  const handleNavClick = (section: NavigationSection) => {
    setExpanded(false); // Close mobile collapse
    onSectionSelect?.(section.id);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.fullName) {
              setAdminName(data.fullName);
              return;
            }
          }
        } catch (err) {
          console.error("Error loading user name:", err);
        }
        setAdminName(currentUser.email || 'Admin Portal');
      } else {
        setAdminName('Admin Portal');
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Navbar expanded={expanded} onToggle={setExpanded} expand={false} bg="white" className="shadow-sm py-3 mb-4 navbar-custom">
      <Container className="d-flex justify-content-between align-items-center flex-wrap">
        
        <div className="d-flex flex-column">
          <Navbar.Brand className="m-0 text-primary fw-bold fs-5 brand-title" style={{ lineHeight: '1.2' }}>{title}</Navbar.Brand>
          <span className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem', marginTop: '2px', letterSpacing: '0.05em' }}>{adminName}</span>
        </div>

        {/* Desktop Tabs: screens > 1000px */}
        {onSectionSelect && (
          <Nav className="flex-row gap-2 nav-desktop-tabs mx-auto">
            {sections.map((sec) => {
              const isActive = sec.id === activeSection;
              return (
                <Nav.Link
                  key={sec.id}
                  onClick={() => handleNavClick(sec)}
                  className={`px-3 py-2 rounded transition-all fw-semibold d-flex align-items-center gap-2 ${
                    isActive 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-secondary hover-bg-light'
                  }`}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="material-symbols-outlined fs-5">{sec.icon}</span>
                  <span>{sec.label}</span>
                </Nav.Link>
              );
            })}
          </Nav>
        )}

        <div className="d-flex align-items-center gap-2">
          {/* Sign Out Button */}
          <Button variant="outline-danger" size="sm" onClick={handleLogout} className="logout-btn">
            Sign Out
          </Button>

          {/* Hamburger Button for screens <= 1000px placed on the right next to Sign Out */}
          {onSectionSelect && (
            <Navbar.Toggle 
              aria-controls="admin-navbar-nav" 
              className="border-0 nav-mobile-toggle px-2"
              onClick={() => setExpanded(!expanded)}
            >
              <span className="navbar-toggler-icon" style={{ width: '1.2em', height: '1.2em' }}></span>
            </Navbar.Toggle>
          )}
        </div>

        {/* Mobile Collapsible Menu (Dropdown): screens <= 1000px */}
        {onSectionSelect && (
          <Navbar.Collapse id="admin-navbar-nav" className="w-100 nav-mobile-collapse mt-3">
            <Nav className="flex-column gap-1 pt-2 border-top">
              {sections.map((sec) => {
                const isActive = sec.id === activeSection;
                return (
                  <Nav.Link
                    key={sec.id}
                    onClick={() => handleNavClick(sec)}
                    className={`px-4 py-2 rounded fw-semibold d-flex align-items-center gap-3 ${
                      isActive 
                        ? 'bg-primary text-white' 
                        : 'text-secondary hover-bg-light'
                    }`}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="material-symbols-outlined fs-5">{sec.icon}</span>
                    <span>{sec.label}</span>
                  </Nav.Link>
                );
              })}
            </Nav>
          </Navbar.Collapse>
        )}

      </Container>
    </Navbar>
  );
};

export default DashboardNavbar;
