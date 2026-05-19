import React from 'react';
import { Card } from 'react-bootstrap';

interface StatCardProps {
  title: string;
  value: string | number;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, variant = 'primary' }) => {
  return (
    <Card className={`border-0 shadow-sm border-start border-4 border-${variant} h-100`}>
      <Card.Body>
        <div className="text-muted small fw-bold text-uppercase">{title}</div>
        <h2 className="m-0 fw-bold">{value}</h2>
      </Card.Body>
    </Card>
  );
};

export default StatCard;
