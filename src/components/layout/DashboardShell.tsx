import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import DashboardNavbar from './DashboardNavbar';
import type { NavigationSection } from './DashboardNavbar';
import DashboardSidebar from './DashboardSidebar';
import NotificationBell from '../common/NotificationBell';

interface SectionPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
}

interface DashboardShellProps {
  title: string;
  children: React.ReactNode;
  fluid?: boolean;
  activeSection?: string;
  onSectionSelect?: (section: string) => void;
  sections?: NavigationSection[];
  /** Optional page-level section header shown at top of content area */
  pageHeader?: SectionPageHeaderProps;
}

const DashboardShell: React.FC<DashboardShellProps> = ({
  title,
  children,
  fluid = false,
  activeSection,
  onSectionSelect,
  sections,
  pageHeader,
}) => {
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUid(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);
  return (
    <div className="dashboard-layout d-flex min-vh-100">
      {/* Left Sidebar: Desktop Only */}
      {onSectionSelect && activeSection && (
        <DashboardSidebar
          title={title}
          activeSection={activeSection}
          onSectionSelect={onSectionSelect}
          sections={sections}
        />
      )}

      {/* Main Content Area */}
      <div className="main-content-wrapper flex-grow-1 d-flex flex-column min-vh-100" style={{ minWidth: 0 }}>
        {/* Top Navbar: Mobile Only */}
        <DashboardNavbar
          title={title}
          activeSection={activeSection}
          onSectionSelect={onSectionSelect}
          sections={sections}
        />

        {/* Inner Content Body */}
        <main className="flex-grow-1 py-4 px-3 px-md-5">
          <Container fluid={fluid} className="h-100 p-0">
            {/* Section Page Header — rendered only when pageHeader is provided */}
            {pageHeader && (
              <div className="section-page-header">
                {/* Left: title + subtitle */}
                <div>
                  <p className="sph-title d-flex align-items-center gap-2">
                    {pageHeader.icon && (
                      <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontSize: '0.85em', fontVariationSettings: "'FILL' 0, 'wght' 600" }}
                      >
                        {pageHeader.icon}
                      </span>
                    )}
                    <span>{pageHeader.title}</span>
                  </p>
                  {pageHeader.subtitle && (
                    <p className="sph-subtitle">{pageHeader.subtitle}</p>
                  )}
                </div>

                {/* Notification Bell — always top-right */}
                <NotificationBell uid={currentUid} />
              </div>
            )}

            <div key={activeSection} className="dashboard-content-fade">
              {children}
            </div>
          </Container>
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
