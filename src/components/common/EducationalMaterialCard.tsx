import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import type { EducationalMaterial, EducationalResourceType } from '../../hooks/useEducationalMaterials';
import { formatFileSize } from '../../utils/pdfScreening';

interface EducationalMaterialCardProps {
  material: EducationalMaterial;
  isAdmin?: boolean;
  onEdit?: (material: EducationalMaterial) => void;
  onDelete?: (material: EducationalMaterial) => void;
}

interface TypeConfig {
  icon: string;
  label: string;
  badgeBg: string;
  badgeColor: string;
  iconBg: string;
  iconColor: string;
}

const TYPE_CONFIGS: Record<EducationalResourceType, TypeConfig> = {
  pdf: {
    icon: 'picture_as_pdf',
    label: 'PDF Document',
    badgeBg: '#FEE2E2',
    badgeColor: '#991B1B',
    iconBg: '#FEF2F2',
    iconColor: '#DC2626',
  },
  docx: {
    icon: 'description',
    label: 'Word Document',
    badgeBg: '#DBEAFE',
    badgeColor: '#1E40AF',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
  },
  xlsx: {
    icon: 'table_chart',
    label: 'Spreadsheet',
    badgeBg: '#D1FAE5',
    badgeColor: '#065F46',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
  },
  pptx: {
    icon: 'slideshow',
    label: 'Presentation',
    badgeBg: '#FEF3C7',
    badgeColor: '#92400E',
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
  },
  video_link: {
    icon: 'smart_display',
    label: 'Video Tutorial',
    badgeBg: '#EDE9FE',
    badgeColor: '#5B21B6',
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
  },
  external_link: {
    icon: 'open_in_new',
    label: 'Web Resource',
    badgeBg: '#E0F2FE',
    badgeColor: '#075985',
    iconBg: '#F0F9FF',
    iconColor: '#0284C7',
  },
};

const EducationalMaterialCard: React.FC<EducationalMaterialCardProps> = ({
  material,
  isAdmin = false,
  onEdit,
  onDelete,
}) => {
  const typeConfig = TYPE_CONFIGS[material.resourceType] || TYPE_CONFIGS.external_link;
  const isLink = material.resourceType === 'video_link' || material.resourceType === 'external_link';
  const targetUrl = isLink ? material.externalUrl : material.fileUrl;

  const formattedDate = material.createdAt
    ? new Date(material.createdAt.toMillis()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const getDomainHost = (url?: string) => {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <Card
      className="h-100 border-0 shadow-sm rounded-3 transition-all"
      style={{
        background: '#FFFFFF',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <Card.Body className="p-4 d-flex flex-column">
        {/* Header Badges & Icon */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center"
            style={{
              width: '46px',
              height: '46px',
              backgroundColor: typeConfig.iconBg,
              color: typeConfig.iconColor,
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>
              {typeConfig.icon}
            </span>
          </div>

          <div className="d-flex flex-column align-items-end gap-1">
            <span
              className="badge rounded-pill fw-semibold px-2 py-1"
              style={{
                backgroundColor: typeConfig.badgeBg,
                color: typeConfig.badgeColor,
                fontSize: '11px',
              }}
            >
              {typeConfig.label}
            </span>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Category Badge */}
        <div className="mb-2">
          <Badge
            bg="light"
            text="dark"
            className="border text-secondary fw-semibold px-2 py-1 rounded-2"
            style={{ fontSize: '11px' }}
          >
            {material.category}
          </Badge>
        </div>

        {/* Title */}
        <h5
          className="fw-bold text-dark mb-2"
          style={{
            fontSize: '15px',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={material.title}
        >
          {material.title}
        </h5>

        {/* Description */}
        <p
          className="text-muted mb-3 flex-grow-1"
          style={{
            fontSize: '13px',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {material.description || 'No description provided.'}
        </p>

        {/* File Meta / Domain info */}
        <div className="pt-2 border-top mb-3 d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '12px' }}>
          {isLink ? (
            <div className="d-flex align-items-center gap-1 text-truncate" title={material.externalUrl}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                link
              </span>
              <span className="text-truncate">{getDomainHost(material.externalUrl)}</span>
            </div>
          ) : (
            <div className="d-flex align-items-center gap-1 text-truncate">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                attach_file
              </span>
              <span>{material.fileSizeBytes ? formatFileSize(material.fileSizeBytes) : 'File'}</span>
            </div>
          )}

          <div className="text-muted" style={{ fontSize: '11px' }}>
            By: <span className="fw-medium text-dark">{material.uploadedBy || 'LYDO'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex align-items-center gap-2">
          {targetUrl ? (
            <Button
              as="a"
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={!isLink}
              variant={isLink ? 'outline-primary' : 'primary'}
              size="sm"
              className="w-100 d-inline-flex align-items-center justify-content-center gap-1 py-2 fw-semibold rounded-2"
              style={{ fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {isLink ? 'open_in_new' : 'download'}
              </span>
              {isLink
                ? material.resourceType === 'video_link'
                  ? 'Watch Video'
                  : 'Open Resource'
                : 'Download File'}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" disabled className="w-100 py-2 rounded-2" style={{ fontSize: '13px' }}>
              Resource Unavailable
            </Button>
          )}

          {/* Admin Controls */}
          {isAdmin && (
            <div className="d-flex gap-1">
              {onEdit && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => onEdit(material)}
                  className="px-2 py-2 rounded-2"
                  title="Edit Material"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', display: 'block' }}>
                    edit
                  </span>
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => onDelete(material)}
                  className="px-2 py-2 rounded-2"
                  title="Delete Material"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', display: 'block' }}>
                    delete
                  </span>
                </Button>
              )}
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default EducationalMaterialCard;
