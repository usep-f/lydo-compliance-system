import React from 'react';
import { Container } from 'react-bootstrap';
import NavigationBar from './NavigationBar';

interface DashboardShellProps {
  title: string;
  children: React.ReactNode;
  fluid?: boolean;
}

const DashboardShell: React.FC<DashboardShellProps> = ({ 
  title, 
  children, 
  fluid = false 
}) => {
  return (
    <div className="bg-light min-vh-100 pb-5">
      <NavigationBar title={title} />
      <Container fluid={fluid}>
        {children}
      </Container>
    </div>
  );
};

export default DashboardShell;
