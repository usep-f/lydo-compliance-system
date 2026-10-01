import React, { useState } from 'react';
import type { Bulletin } from '../../hooks/useCMSData';
import { getBulletinVisual } from '../../utils/bulletinVisualUtils';
import lucenaLogo from '../../assets/lydo-logo.png';

interface BulletinVisualBannerProps {
  bulletin: Bulletin;
  variant?: 'hero' | 'thumbnail' | 'card';
  className?: string;
  style?: React.CSSProperties;
}

export const BulletinVisualBanner: React.FC<BulletinVisualBannerProps> = ({
  bulletin,
  variant = 'hero',
  className = '',
  style = {}
}) => {
  const [imageError, setImageError] = useState(false);
  const visual = getBulletinVisual(bulletin);
  const { theme } = visual;

  const showCustomImage = visual.hasCustomImage && !imageError && Boolean(visual.imageUrl);

  if (variant === 'thumbnail') {
    return (
      <div
        className={`position-relative overflow-hidden rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 ${className}`}
        style={{
          width: '52px',
          height: '52px',
          background: showCustomImage ? '#0f172a' : theme.gradient,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          ...style
        }}
      >
        {showCustomImage ? (
          <img
            src={visual.imageUrl}
            alt={bulletin.title}
            className="w-100 h-100 object-fit-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="d-flex flex-column align-items-center justify-content-center text-white text-center">
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '24px',
                color: '#ffffff',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}
            >
              {theme.icon}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`position-relative overflow-hidden w-100 ${className}`}
        style={{
          height: '100px',
          background: showCustomImage ? '#0f172a' : theme.gradient,
          ...style
        }}
      >
        {showCustomImage ? (
          <>
            <img
              src={visual.imageUrl}
              alt={bulletin.title}
              className="w-100 h-100 object-fit-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
            <div
              className="position-absolute inset-0"
              style={{
                background: 'linear-gradient(to top, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0.1) 60%, transparent 100%)',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }}
            />
          </>
        ) : (
          <div className="position-absolute inset-0 d-flex align-items-center justify-content-between px-3 text-white w-100 h-100 overflow-hidden">
            {/* Background SVG decorative motif */}
            <svg
              className="position-absolute"
              style={{ right: '-15px', bottom: '-20px', width: '130px', height: '130px', opacity: 0.18 }}
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="40" stroke="#ffffff" strokeWidth="6" strokeDasharray="6 6" />
              <polygon points="50,15 85,75 15,75" stroke="#ffffff" strokeWidth="4" />
            </svg>
            <div className="d-flex align-items-center gap-2.5 z-1">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: '34px',
                  height: '34px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.35)'
                }}
              >
                <span className="material-symbols-outlined text-white" style={{ fontSize: '18px' }}>
                  {theme.icon}
                </span>
              </div>
              <span className="fw-semibold text-white text-truncate" style={{ maxWidth: '170px', fontSize: '12px', letterSpacing: '0.2px' }}>
                {theme.categoryLabel}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default 'hero' variant
  return (
    <div
      className={`position-relative overflow-hidden rounded-4 d-flex flex-column justify-content-between ${className}`}
      style={{
        minHeight: '280px',
        height: '100%',
        background: showCustomImage ? '#0f172a' : theme.gradient,
        boxShadow: '0 12px 32px -8px rgba(0, 110, 183, 0.25)',
        ...style
      }}
    >
      {showCustomImage ? (
        <>
          <img
            src={visual.imageUrl}
            alt={bulletin.title}
            className="position-absolute top-0 start-0 w-100 h-100 object-fit-cover"
            onError={() => setImageError(true)}
            loading="eager"
          />
          {/* Subtle dark gradient overlay for text readability */}
          <div
            className="position-absolute top-0 start-0 w-100 h-100"
            style={{
              background: 'linear-gradient(180deg, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.1) 40%, rgba(15,23,42,0.75) 100%)',
              zIndex: 1
            }}
          />
        </>
      ) : (
        <>
          {/* Layered Decorative Vector Mesh */}
          <svg
            className="position-absolute top-0 start-0 w-100 h-100"
            preserveAspectRatio="none"
            viewBox="0 0 400 300"
            style={{ opacity: 0.15, pointerEvents: 'none', zIndex: 1 }}
          >
            <defs>
              <pattern id={`hero-grid-${bulletin.id}`} width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#hero-grid-${bulletin.id})`} />
            <circle cx="360" cy="50" r="140" fill={theme.secondaryColor} fillOpacity="0.3" filter="blur(30px)" />
            <circle cx="40" cy="260" r="120" fill={theme.accentColor} fillOpacity="0.2" filter="blur(40px)" />
          </svg>

          {/* Central Thematic Focal Icon */}
          <div
            className="position-absolute top-50 start-50 translate-middle d-flex align-items-center justify-content-center"
            style={{ zIndex: 1 }}
          >
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: '100px',
                height: '100px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(16px)',
                border: '1.5px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              <span
                className="material-symbols-outlined text-white"
                style={{
                  fontSize: '52px',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))'
                }}
              >
                {theme.icon}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Header Overlay Badges */}
      <div className="d-flex align-items-center justify-content-between position-relative" style={{ zIndex: 2, padding: '1.15rem 1.25rem' }}>
        <div
          className="d-inline-flex align-items-center gap-1.5 px-3 py-1.5 rounded-pill"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.3px'
          }}
        >
          <span className="material-symbols-outlined fs-6 text-info">{theme.icon}</span>
          <span>{theme.categoryLabel}</span>
        </div>

        {/* Lucena Seal Watermark Emblem */}
        <div
          className="d-flex align-items-center gap-1.5 px-2.5 py-1 rounded-pill"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          <img src={lucenaLogo} alt="LYDO" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
          <span className="text-white fw-bold" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
            LUCENA LYDO
          </span>
        </div>
      </div>

      {/* Bottom Overlay Status Pill */}
      <div className="position-relative" style={{ zIndex: 2, padding: '1.15rem 1.25rem' }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div
            className={`d-inline-flex align-items-center gap-1.5 px-3 py-1 rounded-pill ${theme.urgencyBadgeClass}`}
            style={{ fontSize: '11px', fontWeight: 600 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
              {theme.urgency === 'urgent' ? 'warning' : theme.urgency === 'reminder' ? 'schedule' : 'verified'}
            </span>
            <span>{theme.urgencyLabel}</span>
          </div>

          {bulletin.eventKey && (
            <span
              className="badge text-white px-2.5 py-1 rounded-pill"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                fontSize: '10px',
                fontWeight: 600
              }}
            >
              System Auto-Sync
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulletinVisualBanner;
