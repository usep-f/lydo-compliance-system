import { Card } from 'react-bootstrap';
import DashboardShell from '../components/layout/DashboardShell';

export default function UserDashboard() {
  return (
    <DashboardShell title="User Dashboard">
      <Card className="shadow-sm border-0">
        <Card.Body className="text-center p-5">
          <h2 className="mb-4 text-primary fw-bold">Welcome Back!</h2>
          <p className="text-muted mb-0">You are logged in to the Lydo Compliance System.</p>
          <p className="text-muted mb-4">More features and tools are coming soon.</p>
        </Card.Body>
      </Card>
    </DashboardShell>
  );
}
