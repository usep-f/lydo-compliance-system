import type { Bulletin } from '../hooks/useCMSData';

export type UrgencyLevel = 'open' | 'reminder' | 'urgent' | 'standard';

export interface BulletinVisualTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gradient: string;
  icon: string;
  categoryLabel: string;
  urgency: UrgencyLevel;
  urgencyLabel: string;
  urgencyBadgeClass: string;
  patternType: 'grid' | 'waves' | 'circles' | 'dots';
}

export interface BulletinVisualResult {
  hasCustomImage: boolean;
  imageUrl?: string;
  theme: BulletinVisualTheme;
}

/**
 * Deterministically resolves the visual representation of a bulletin.
 * Handles custom uploaded images, automated scheduler eventKeys, and category-based manual fallbacks.
 */
export function getBulletinVisual(bulletin: Bulletin): BulletinVisualResult {
  const hasCustomImage = Boolean(bulletin.imageUrl && bulletin.imageUrl.trim().length > 0);

  // 1. Analyze automated eventKey if present (e.g., auto_full_disclosure_2026-Q3_reminder)
  if (bulletin.eventKey) {
    const key = bulletin.eventKey.toLowerCase();
    
    // Determine urgency level
    let urgency: UrgencyLevel = 'standard';
    let urgencyLabel = 'System Notice';
    let urgencyBadgeClass = 'bg-primary text-white';

    if (key.endsWith('_open')) {
      urgency = 'open';
      urgencyLabel = 'Submissions Open';
      urgencyBadgeClass = 'bg-info-subtle text-info border border-info-subtle';
    } else if (key.endsWith('_reminder')) {
      urgency = 'reminder';
      urgencyLabel = '7-Day Compliance Notice';
      urgencyBadgeClass = 'bg-warning-subtle text-warning border border-warning-subtle';
    } else if (key.endsWith('_final')) {
      urgency = 'urgent';
      urgencyLabel = 'Urgent: 3 Days Remaining';
      urgencyBadgeClass = 'bg-danger text-white shadow-sm';
    }

    // Determine document type theme
    if (key.includes('full_disclosure')) {
      return {
        hasCustomImage,
        imageUrl: bulletin.imageUrl,
        theme: {
          primaryColor: '#006EB7',
          secondaryColor: '#00B4D8',
          accentColor: '#E0F2FE',
          gradient: 'linear-gradient(135deg, #0A2540 0%, #006EB7 50%, #0284C7 100%)',
          icon: 'policy',
          categoryLabel: 'Full Disclosure Policy Board',
          urgency,
          urgencyLabel,
          urgencyBadgeClass,
          patternType: 'grid'
        }
      };
    }

    if (key.includes('regular_session')) {
      return {
        hasCustomImage,
        imageUrl: bulletin.imageUrl,
        theme: {
          primaryColor: '#059669',
          secondaryColor: '#10B981',
          accentColor: '#D1FAE5',
          gradient: 'linear-gradient(135deg, #064E3B 0%, #059669 50%, #10B981 100%)',
          icon: 'gavel',
          categoryLabel: 'Regular Session Minutes',
          urgency,
          urgencyLabel,
          urgencyBadgeClass,
          patternType: 'waves'
        }
      };
    }

    if (key.includes('kk_minutes')) {
      return {
        hasCustomImage,
        imageUrl: bulletin.imageUrl,
        theme: {
          primaryColor: '#7C3AED',
          secondaryColor: '#A78BFA',
          accentColor: '#EDE9FE',
          gradient: 'linear-gradient(135deg, #3B0764 0%, #6D28D9 50%, #8B5CF6 100%)',
          icon: 'groups',
          categoryLabel: 'Katipunan ng Kabataan Minutes',
          urgency,
          urgencyLabel,
          urgencyBadgeClass,
          patternType: 'circles'
        }
      };
    }
  }

  // 2. Manual Bulletin fallback based on tag
  const tag = (bulletin.tag || 'Announcement').toLowerCase();

  if (tag.includes('deadline')) {
    return {
      hasCustomImage,
      imageUrl: bulletin.imageUrl,
      theme: {
        primaryColor: '#DC2626',
        secondaryColor: '#F87171',
        accentColor: '#FEE2E2',
        gradient: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 50%, #EA580C 100%)',
        icon: 'alarm_on',
        categoryLabel: 'Compliance Deadline',
        urgency: 'urgent',
        urgencyLabel: 'Official Deadline Notice',
        urgencyBadgeClass: 'bg-danger text-white',
        patternType: 'dots'
      }
    };
  }

  if (tag.includes('guideline')) {
    return {
      hasCustomImage,
      imageUrl: bulletin.imageUrl,
      theme: {
        primaryColor: '#D97706',
        secondaryColor: '#FBBF24',
        accentColor: '#FEF3C7',
        gradient: 'linear-gradient(135deg, #78350F 0%, #D97706 50%, #F59E0B 100%)',
        icon: 'menu_book',
        categoryLabel: 'Operating Guidelines',
        urgency: 'reminder',
        urgencyLabel: 'Compliance Advisory',
        urgencyBadgeClass: 'bg-warning-subtle text-warning border border-warning-subtle',
        patternType: 'grid'
      }
    };
  }

  if (tag.includes('update') || tag.includes('system')) {
    return {
      hasCustomImage,
      imageUrl: bulletin.imageUrl,
      theme: {
        primaryColor: '#2563EB',
        secondaryColor: '#60A5FA',
        accentColor: '#DBEAFE',
        gradient: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #38BDF8 100%)',
        icon: 'notifications_active',
        categoryLabel: 'System Update',
        urgency: 'open',
        urgencyLabel: 'Portal Directive',
        urgencyBadgeClass: 'bg-primary-subtle text-primary border border-primary-subtle',
        patternType: 'waves'
      }
    };
  }

  // Default: General Announcement
  return {
    hasCustomImage,
    imageUrl: bulletin.imageUrl,
    theme: {
      primaryColor: '#006EB7',
      secondaryColor: '#00B4D8',
      accentColor: '#E0F2FE',
      gradient: 'linear-gradient(135deg, #0F172A 0%, #006EB7 60%, #0284C7 100%)',
      icon: 'campaign',
      categoryLabel: 'Official Announcement',
      urgency: 'standard',
      urgencyLabel: 'Office Bulletin',
      urgencyBadgeClass: 'bg-primary-subtle text-primary border border-primary-subtle',
      patternType: 'circles'
    }
  };
}
