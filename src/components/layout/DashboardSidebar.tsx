import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import lydoLogo from '../../assets/lydo-logo.webp';

export interface NavigationSection {
  id: string;
  label: string;
  isImplemented: boolean;
  icon: string;
}

export interface NavigationCategory {
  title: string;
  sections: NavigationSection[];
}

interface DashboardSidebarProps {
  title: string;
  activeSection: string;
  onSectionSelect: (section: string) => void;
  sections?: NavigationSection[];
}

const DEFAULT_SECTIONS: NavigationSection[] = [
  { id: 'home',        label: 'Home',               isImplemented: true,  icon: 'home' },
  { id: 'applicants',  label: 'Applicants',         isImplemented: true,  icon: 'badge' },
  { id: 'users',       label: 'Users',              isImplemented: true,  icon: 'group' },
  { id: 'submissions', label: 'Submissions',        isImplemented: true,  icon: 'description' },
  { id: 'history',     label: 'History',            isImplemented: true,  icon: 'history' },
  { id: 'analytics',   label: 'Analytics',          isImplemented: true,  icon: 'bar_chart' },
  { id: 'matrix',      label: 'Compliance Matrix',  isImplemented: true,  icon: 'grid_on' },
  { id: 'cms',         label: 'CMS Portal',         isImplemented: true,  icon: 'campaign' },
  { id: 'settings',    label: 'User Settings',      isImplemented: true,  icon: 'settings' },
];

/** Per-section icon color class applied when the link is NOT active */
const SECTION_ICON_CLASS: Record<string, string> = {
  home:        'sidebar-icon-home',
  applicants:  'sidebar-icon-applicants',
  users:       'sidebar-icon-users',
  submissions: 'sidebar-icon-submissions',
  history:     'sidebar-icon-history',
  analytics:   'sidebar-icon-analytics',
  matrix:      'sidebar-icon-matrix',
  cms:         'sidebar-icon-cms',
  settings:    'sidebar-icon-settings',
};

const CATEGORY_ORDER: { title: string; ids: string[] }[] = [
  { title: 'OVERVIEW', ids: ['home'] },
  { title: 'USER MANAGEMENT', ids: ['applicants', 'users'] },
  { title: 'COMPLIANCE & SUBMISSIONS', ids: ['submissions', 'history', 'analytics', 'matrix'] },
  { title: 'SYSTEM & CONTENT', ids: ['cms', 'settings'] },
];

function groupSectionsIntoCategories(rawSections: NavigationSection[]): NavigationCategory[] {
  const sectionMap = new Map<string, NavigationSection>();
  rawSections.forEach((sec) => sectionMap.set(sec.id, sec));

  const categories: NavigationCategory[] = [];
  const handledIds = new Set<string>();

  CATEGORY_ORDER.forEach(({ title, ids }) => {
    const matchedSections: NavigationSection[] = [];
    ids.forEach((id) => {
      const sec = sectionMap.get(id);
      if (sec) {
        matchedSections.push(sec);
        handledIds.add(id);
      }
    });
    if (matchedSections.length > 0) {
      categories.push({ title, sections: matchedSections });
    }
  });

  const unhandledSections = rawSections.filter((sec) => !handledIds.has(sec.id));
  if (unhandledSections.length > 0) {
    categories.push({ title: 'NAVIGATION', sections: unhandledSections });
  }

  return categories;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  title,
  activeSection,
  onSectionSelect,
  sections = DEFAULT_SECTIONS,
}) => {
  const [adminName, setAdminName] = useState<string>('Loading...');
  const [adminRole, setAdminRole] = useState<string>('user');
  const navigate = useNavigate();

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

  const groupedCategories = useMemo(
    () => groupSectionsIntoCategories(sections),
    [sections],
  );

  return (
    <aside className="sidebar-container d-flex flex-column">
      {/* ── Brand Header ── */}
      <div className="sidebar-brand-wrapper">
        <div className="sidebar-brand-logo">
          <div className="sidebar-brand-icon" style={{ background: '#FFFFFF', padding: '3px', overflow: 'hidden' }}>
            <img 
              src={lydoLogo} 
              alt="LYDO Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
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
        {groupedCategories.map((cat, catIdx) => (
          <div key={cat.title} className={catIdx > 0 ? 'mt-3' : ''}>
            <div className="sidebar-section-label">{cat.title}</div>
            {cat.sections.map((sec) => {
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
          </div>
        ))}
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
        <button
          type="button"
          className="sidebar-home-btn"
          onClick={() => navigate('/')}
        >
          <span className="material-symbols-outlined">home</span>
          <span>Homepage</span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
