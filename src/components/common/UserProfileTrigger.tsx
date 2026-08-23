import React from 'react';
import { useUserProfileModal } from '../../context/UserProfileModalContext';

interface UserProfileTriggerProps {
  userId?: string;
  name?: string;
  fullName?: string;
  subtitle?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

const UserProfileTrigger: React.FC<UserProfileTriggerProps> = ({ 
  userId, 
  name, 
  fullName,
  subtitle,
  className = '',
  style,
  title
}) => {
  const { openUserProfile } = useUserProfileModal();
  const displayName = fullName || name || '';

  if (!displayName) {
    return <span className="text-muted">—</span>;
  }

  // If no userId is provided, fallback to plain text name
  if (!userId) {
    return (
      <div className={`user-profile-trigger ${className}`.trim()} style={style}>
        <div 
          className="fw-semibold cell-text-clamp-2" 
          title={title || displayName}
        >
          {displayName}
        </div>
        {subtitle && <div className="cell-subtitle">{subtitle}</div>}
      </div>
    );
  }

  return (
    <div className={`user-profile-trigger ${className}`.trim()} style={style}>
      <button 
        type="button" 
        className="user-profile-btn" 
        onClick={(e) => {
          e.stopPropagation();
          openUserProfile(userId);
        }}
        title={title || `View profile of ${displayName}`}
      >
        <span className="fw-semibold cell-text-clamp-2 user-profile-name">
          {displayName}
        </span>
      </button>
      {subtitle && <div className="cell-subtitle">{subtitle}</div>}
    </div>
  );
};

export default UserProfileTrigger;
