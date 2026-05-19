import React from 'react';
import { Container, Button, Navbar } from 'react-bootstrap';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

interface NavigationBarProps {
  title: string;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ title }) => {
  const handleLogout = () => signOut(auth);

  return (
    <Navbar bg="white" className="shadow-sm py-3 mb-4">
      <Container className="d-flex justify-content-between align-items-center">
        <Navbar.Brand className="m-0 text-primary fw-bold">{title}</Navbar.Brand>
        <Button variant="outline-danger" size="sm" onClick={handleLogout}>
          Sign Out
        </Button>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
