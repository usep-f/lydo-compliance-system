import React, { useState, useEffect } from 'react';
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
  { id: 'home',        label: 'Home',          isImplemented: true,  icon: 'home' },
  { id: 'applicants',  label: 'Applicants',    isImplemented: true,  icon: 'badge' },
  { id: 'users',       label: 'Users',         isImplemented: true,  icon: 'group' },
  { id: 'submissions', label: 'Submissions',   isImplemented: true,  icon: 'description' },
  { id: 'history',     label: 'History',       isImplemented: true,  icon: 'history' },
  { id: 'analytics',   label: 'Analytics',     isImplemented: true,  icon: 'bar_chart' },
  { id: 'settings',    label: 'User Settings', isImplemented: false, icon: 'settings' },
];

/** Per-section icon color class applied when the link is NOT active */
const SECTION_ICON_CLASS: Record<string, string> = {
  home:        'sidebar-icon-home',
  applicants:  'sidebar-icon-applicants',
  users:       'sidebar-icon-users',
  submissions: 'sidebar-icon-submissions',
  history:     'sidebar-icon-history',
  analytics:   'sidebar-icon-analytics',
  settings:    'sidebar-icon-settings',
};

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  title,
  activeSection,
  onSectionSelect,
  sections = DEFAULT_SECTIONS,
}) => {
  const [adminName, setAdminName] = useState<string>('Loading...');
  const [adminRole, setAdminRole] = useState<string>('user');

  const handleLogout = () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.fullName) setAdminName(data.fullName);
            if (data.role) setAdminRole(data.role);
            return;
          }
        } catch (err) {
          console.error('Error loading user name:', err);
        }
        setAdminName(currentUser.email || 'Admin Portal');
      } else {
        setAdminName('Admin Portal');
      }
    });
    return () => unsubscribe();
  }, []);

  /** First two initials for the avatar */
  const initials = adminName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

  const isAdmin = adminRole === 'admin';

  return (
    <aside className="sidebar-container d-flex flex-column">
      {/* ── Brand Header ── */}
      <div className="sidebar-brand-wrapper">
        <div className="sidebar-brand-logo">
          <div className="sidebar-brand-icon">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div>
            <h4 className="m-0">{title}</h4>
            <span className="sidebar-brand-tagline">Compliance System</span>
          </div>
        </div>

        {/* User chip */}
        <div className="sidebar-user-chip">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-name">{adminName}</div>
          <span className={`sidebar-user-role ${isAdmin ? 'sidebar-role-admin' : 'sidebar-role-user'}`}>
            {isAdmin ? 'Admin' : 'SK'}
          </span>
        </div>
      </div>

      {/* ── Nav Links ── */}
      <nav className="flex-grow-1 px-3 py-3 sidebar-nav-links" style={{ overflowY: 'auto' }}>
        <div className="sidebar-section-label">Navigation</div>
        {sections.map((sec) => {
          const isActive = sec.id === activeSection;
          const iconClass = isActive ? '' : (SECTION_ICON_CLASS[sec.id] || '');

          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onSectionSelect(sec.id)}
              className={`sidebar-link w-100 border-0 text-start${isActive ? ' bg-primary' : ''}`}
              style={{ cursor: 'pointer', background: 'none' }}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={`material-symbols-outlined ${iconClass}`}>
                {sec.icon}
              </span>
              <span>{sec.label}</span>
              {!sec.isImplemented && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.35)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '9999px',
                    padding: '1px 6px',
                  }}
                >
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Logout Footer ── */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={handleLogout}
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
