import React from 'react';
import { Card } from 'react-bootstrap';

interface StatCardProps {
  title: string;
  value: string | number;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, variant = 'primary' }) => {
  return (
    <Card className={`border-0 border-start border-4 border-${variant} h-100 shadow-subtle`}>
      <Card.Body className="d-flex flex-column justify-content-center py-3 px-4">
        <div className="overline-text text-muted mb-1">{title}</div>
        <div className="display-text text-dark fw-bold">{value}</div>
      </Card.Body>
    </Card>
  );
};

export default StatCard;
