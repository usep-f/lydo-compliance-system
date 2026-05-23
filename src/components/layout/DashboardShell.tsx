import React from 'react';
import { Container } from 'react-bootstrap';
import DashboardNavbar from './DashboardNavbar';
import type { NavigationSection } from './DashboardNavbar';
import DashboardSidebar from './DashboardSidebar';

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
      <div className="main-content-wrapper flex-grow-1 d-flex flex-column min-vh-100">
        {/* Top Navbar: Mobile Only */}
        <DashboardNavbar
          title={title}
          activeSection={activeSection}
          onSectionSelect={onSectionSelect}
          sections={sections}
        />

        {/* Inner Content Body */}
        <main className="flex-grow-1 py-4 px-3 px-md-4">
          <Container fluid={fluid} className="h-100 p-0">
            {/* Section Page Header — injected from parent page */}
            {pageHeader && (
              <div className="section-page-header">
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
