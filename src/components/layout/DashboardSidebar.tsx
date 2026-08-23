import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
  const [adminAvatar, setAdminAvatar] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('lydo_sidebar_collapsed') === 'true';
  });
  // Controls text visibility to prevent text wrapping/jittering during expansion animation
  const [showText, setShowText] = useState<boolean>(!isCollapsed);

  const navigate = useNavigate();

  const handleLogout = () => signOut(auth);

  const toggleCollapse = () => {
    if (isCollapsed) {
      // Expanding: Expand width first, then show text after width transition completes (240ms)
      setIsCollapsed(false);
      localStorage.setItem('lydo_sidebar_collapsed', 'false');
      setTimeout(() => {
        setShowText(true);
      }, 240);
    } else {
      // Collapsing: Hide text instantly, then shrink width
      setShowText(false);
      setIsCollapsed(true);
      localStorage.setItem('lydo_sidebar_collapsed', 'true');
    }
  };

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.fullName) setAdminName(data.fullName);
            if (data.role) setAdminRole(data.role);
            setAdminAvatar(data.avatarUrl || '');
          } else {
            setAdminName(currentUser.email || 'Admin Portal');
            setAdminAvatar('');
          }
        }, (err) => {
          console.error('Error loading user profile in sidebar:', err);
        });
      } else {
        if (unsubscribeDoc) unsubscribeDoc();
        setAdminName('Admin Portal');
        setAdminRole('user');
        setAdminAvatar('');
      }
    });

    return () => {
      if (unsubscribeDoc) unsubscribeDoc();
      unsubscribeAuth();
    };
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
    <>
      <div className={`sidebar-placeholder flex-shrink-0${isCollapsed ? ' collapsed' : ''}`} aria-hidden="true" />
      <aside className={`sidebar-container d-flex flex-column${isCollapsed ? ' collapsed' : ''}`}>
      {/* ── Floating Collapse Toggle Button ── */}
      <button
        type="button"
        className="sidebar-collapse-toggle"
        onClick={toggleCollapse}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className="material-symbols-outlined">
          {isCollapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>

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
          {showText && (
            <div className="sidebar-text-fade-in" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <h4 className="m-0">{title}</h4>
              <span className="sidebar-brand-tagline">Compliance System</span>
            </div>
          )}
        </div>

        {/* User chip */}
        <div className="sidebar-user-chip" title={isCollapsed ? `${adminName} (${isAdmin ? 'Admin' : 'SK'})` : undefined}>
          <div className="sidebar-user-avatar">
            {adminAvatar ? (
              <img 
                src={adminAvatar} 
                alt={adminName} 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
              />
            ) : (
              initials
            )}
          </div>
          {showText && (
            <div className="sidebar-text-fade-in d-flex align-items-center justify-content-between gap-2 flex-grow-1" style={{ minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div className="sidebar-user-name">{adminName}</div>
              <span className={`sidebar-user-role ${isAdmin ? 'sidebar-role-admin' : 'sidebar-role-user'}`}>
                {isAdmin ? 'Admin' : 'SK'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Nav Links ── */}
      <nav className="flex-grow-1 px-3 py-3 sidebar-nav-links" style={{ overflowY: 'auto' }}>
        {groupedCategories.map((cat, catIdx) => (
          <div
            key={cat.title}
            className={catIdx > 0 ? (isCollapsed ? 'mt-2 pt-2 border-top border-secondary border-opacity-25' : 'mt-3') : ''}
          >
            {showText && <div className="sidebar-section-label sidebar-text-fade-in">{cat.title}</div>}
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
                  title={isCollapsed ? sec.label : undefined}
                >
                  <span className={`material-symbols-outlined ${iconClass}${showText ? ' sidebar-icon-fade-in' : ''}`}>
                    {sec.icon}
                  </span>
                  {showText && <span className="sidebar-text-fade-in" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{sec.label}</span>}
                  {showText && !sec.isImplemented && (
                    <span
                      className="sidebar-text-fade-in"
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
                        whiteSpace: 'nowrap',
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

      {/* ── Footer Actions Bar ── */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-footer-icon-btn sidebar-home-icon-btn"
          onClick={() => navigate('/')}
          title="Homepage"
        >
          <span className="material-symbols-outlined">home</span>
        </button>
        <button
          type="button"
          className="sidebar-footer-icon-btn sidebar-logout-icon-btn"
          onClick={handleLogout}
          title="Sign Out"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default DashboardSidebar;
