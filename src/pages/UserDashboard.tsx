import { Container, Card } from 'react-bootstrap';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function UserDashboard() {
  const handleLogout = () => signOut(auth);

  return (
    <Container className="py-5">
      <Card className="shadow-sm">
        <Card.Body className="text-center p-5">
          <h2 className="mb-4">User Dashboard</h2>
          <p className="text-muted mb-4">Welcome to your dashboard. More features coming soon.</p>
          <button className="btn btn-outline-danger" onClick={handleLogout}>Sign Out</button>
        </Card.Body>
      </Card>
    </Container>
  );
}
