import React, { useState, useEffect } from 'react';
import { Nav, Button } from 'react-bootstrap';
import { auth, db } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export interface NavigationSection {
  id: string;
  label: string;
  isImplemented: boolean;
  icon: string;
}

interface DashboardSidebarProps {
  title: string;
  activeSection: string;
  onSectionSelect: (section: string) => void;
  sections?: NavigationSection[];
}

const DEFAULT_SECTIONS: NavigationSection[] = [
  { id: 'home', label: 'Home', isImplemented: false, icon: 'home' },
  { id: 'applicants', label: 'Applicants', isImplemented: true, icon: 'badge' },
  { id: 'users', label: 'Users', isImplemented: true, icon: 'group' },
  { id: 'submissions', label: 'Submissions', isImplemented: true, icon: 'description' },
  { id: 'history', label: 'History', isImplemented: true, icon: 'history' },
  { id: 'analytics', label: 'Analytics', isImplemented: true, icon: 'bar_chart' },
  { id: 'settings', label: 'User Settings', isImplemented: false, icon: 'settings' },
];

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  title,
  activeSection,
  onSectionSelect,
  sections = DEFAULT_SECTIONS
}) => {
  const [adminName, setAdminName] = useState<string>('Loading...');

  const handleLogout = () => signOut(auth);

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
    <aside className="sidebar-container bg-white shadow-sm border-end d-flex flex-column">
      {/* Brand Header */}
      <div className="sidebar-brand-wrapper py-4 px-4 border-bottom">
        <h4 className="m-0 text-primary fw-bold text-truncate">{title}</h4>
        <span className="text-muted small fw-bold text-uppercase tracking-wider d-block text-truncate" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
          {adminName}
        </span>
      </div>

      {/* Nav Links */}
      <Nav className="flex-column gap-1 px-3 py-4 flex-grow-1 sidebar-nav-links">
        {sections.map((sec) => {
          const isActive = sec.id === activeSection;
          return (
            <Nav.Link
              key={sec.id}
              onClick={() => onSectionSelect(sec.id)}
              className={`d-flex align-items-center gap-3 px-3 py-2-5 rounded transition-all fw-semibold sidebar-link ${
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

      {/* Bottom Footer with Logout */}
      <div className="p-3 border-top bg-light">
        <Button
          variant="outline-danger"
          className="w-100 py-2 d-flex align-items-center justify-content-center gap-2 fw-bold"
          onClick={handleLogout}
        >
          <span className="material-symbols-outlined fs-5">logout</span>
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
