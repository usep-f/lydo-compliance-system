import { Card } from 'react-bootstrap';
import DashboardShell from '../components/layout/DashboardShell';

export default function UserDashboard() {
  return (
    <DashboardShell title="User Dashboard">
      <Card className="shadow-medium border-0 rounded-xl">
        <Card.Body className="text-center p-5">
          <div className="display-text text-primary mb-3">👋</div>
          <h2 className="mb-3 text-primary fw-bold">Welcome Back!</h2>
          <p className="body-large text-dark mb-1">You are logged in to the Lydo Compliance System.</p>
          <p className="text-muted body-small mb-0">More features and tools are coming soon. Stay tuned!</p>
        </Card.Body>
      </Card>
    </DashboardShell>
  );
}
