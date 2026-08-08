import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  icon?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  variant = 'primary',
  icon,
}) => {
  const defaultIcons: Record<string, string> = {
    primary: 'analytics',
    success: 'check_circle',
    warning: 'pending',
    danger:  'error',
    info:    'info',
  };

  const displayIcon = icon || defaultIcons[variant] || 'analytics';

  return (
    <div className={`kpi-card kpi-gradient-${variant} p-3 p-sm-4 h-100`}>
      <div className="d-flex align-items-start justify-content-between gap-2 gap-sm-3">
        <div className="flex-grow-1 min-w-0">
          <div className="kpi-label">{title}</div>
          <div className="kpi-value mt-1 mt-sm-2">{value}</div>
        </div>
        <div className="kpi-icon-badge">
          <span className="material-symbols-outlined">{displayIcon}</span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
