import React from 'react';
import { Container } from 'react-bootstrap';
import NavigationBar from './NavigationBar';
import Sidebar from './Sidebar';

interface DashboardShellProps {
  title: string;
  children: React.ReactNode;
  fluid?: boolean;
  activeSection?: string;
  onSectionSelect?: (section: string) => void;
}

const DashboardShell: React.FC<DashboardShellProps> = ({ 
  title, 
  children, 
  fluid = false,
  activeSection,
  onSectionSelect
}) => {
  return (
    <div className="dashboard-layout d-flex min-vh-100 bg-light">
      {/* Left Sidebar: Desktop Only */}
      {onSectionSelect && activeSection && (
        <Sidebar
          title={title}
          activeSection={activeSection}
          onSectionSelect={onSectionSelect}
        />
      )}

      {/* Main Content Area */}
      <div className="main-content-wrapper flex-grow-1 d-flex flex-column min-vh-100">
        {/* Top Navbar: Mobile Only (hidden on desktop screens > 1000px if sidebar is active) */}
        <NavigationBar 
          title={title} 
          activeSection={activeSection}
          onSectionSelect={onSectionSelect}
        />
        
        {/* Inner Content Body */}
        <main className="flex-grow-1 py-4 px-3 px-md-4">
          <Container fluid={fluid} className="h-100 p-0">
            {children}
          </Container>
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
