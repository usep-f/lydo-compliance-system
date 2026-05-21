// ---------------------------------------------------------------------------
// Submission Type Definitions — Single Source of Truth
// ---------------------------------------------------------------------------

export type SubmissionCategory = 'scheduled' | 'asap' | 'perennial';
export type Frequency = 'monthly' | 'quarterly' | 'semestral' | 'annual';

export interface SubmissionTypeDefinition {
  id: string;
  label: string;
  category: SubmissionCategory;
  frequency?: Frequency;
  icon: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Scheduled Document Types (period-tracked, PDF upload + approve/deny)
// ---------------------------------------------------------------------------

export const SCHEDULED_TYPES: SubmissionTypeDefinition[] = [
  {
    id: 'full_disclosure',
    label: 'Full Disclosure Policy Board',
    category: 'scheduled',
    frequency: 'quarterly',
    icon: 'policy',
    description: 'Quarterly transparency report required by the Full Disclosure Policy.',
  },
  {
    id: 'regular_session_minutes',
    label: 'Regular Session Minutes of the Meeting',
    category: 'scheduled',
    frequency: 'monthly',
    icon: 'summarize',
    description: 'Monthly minutes from the regular SK session meeting.',
  },
  {
    id: 'kk_minutes',
    label: 'Katipunan ng Kabataan Minutes of the Meeting',
    category: 'scheduled',
    frequency: 'semestral',
    icon: 'groups',
    description: 'Semestral minutes from the Katipunan ng Kabataan assembly.',
  },
];

// ---------------------------------------------------------------------------
// ASAP Document Types (one-time, PDF upload + approve/deny)
// ---------------------------------------------------------------------------

export const ASAP_TYPES: SubmissionTypeDefinition[] = [
  {
    id: 'directory_sk_officials',
    label: 'Directory of SK Officials',
    category: 'asap',
    icon: 'contacts',
    description: 'Complete directory of all SK officials in the barangay.',
  },
  {
    id: 'kk_profiling',
    label: 'KK Profiling',
    category: 'asap',
    icon: 'person_search',
    description: 'Profiling data of Katipunan ng Kabataan members.',
  },
  {
    id: 'list_youth_orgs',
    label: 'List of Youth Organizations',
    category: 'asap',
    icon: 'diversity_3',
    description: 'Registry of active youth organizations in the barangay.',
  },
];

// ---------------------------------------------------------------------------
// Accomplishment Report Sub-Categories
// ---------------------------------------------------------------------------

export const ACCOMPLISHMENT_CATEGORIES = [
  { id: 'activeCitizenship', label: 'Active Citizenship' },
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'economicEmpowerment', label: 'Economic Empowerment' },
  { id: 'education', label: 'Education' },
  { id: 'environment', label: 'Environment' },
  { id: 'globalMobility', label: 'Global Mobility' },
  { id: 'governance', label: 'Governance' },
  { id: 'health', label: 'Health' },
  { id: 'peaceBuildingAndSecurity', label: 'Peace Building and Security' },
  { id: 'socialInclusionAndEquity', label: 'Social Inclusion and Equity' },
] as const;

export type AccomplishmentCategoryId = typeof ACCOMPLISHMENT_CATEGORIES[number]['id'];

// ---------------------------------------------------------------------------
// Perennial Document Types (infinitely submittable PDFs)
// ---------------------------------------------------------------------------

export const PERENNIAL_TYPES: SubmissionTypeDefinition[] = [
  {
    id: 'resolutions',
    label: 'Resolutions',
    category: 'perennial',
    icon: 'gavel',
    description: 'Passed resolutions throughout the year.',
  },
  ...ACCOMPLISHMENT_CATEGORIES.map((cat) => ({
    id: `acc_${cat.id}`,
    label: `Accomplishment: ${cat.label}`,
    category: 'perennial' as SubmissionCategory,
    icon: 'assessment',
    description: `Accomplishment report for ${cat.label}.`,
  })),
];

// ---------------------------------------------------------------------------
// Aggregated lookup
// ---------------------------------------------------------------------------

/** All document types that require PDF upload. */
export const ALL_UPLOAD_TYPES: SubmissionTypeDefinition[] = [
  ...SCHEDULED_TYPES,
  ...ASAP_TYPES,
  ...PERENNIAL_TYPES,
];

/** Lookup map by ID for quick access. */
export const UPLOAD_TYPE_MAP: Record<string, SubmissionTypeDefinition> =
  ALL_UPLOAD_TYPES.reduce((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {} as Record<string, SubmissionTypeDefinition>);

// ---------------------------------------------------------------------------
// Firestore Submission Document Interfaces
// ---------------------------------------------------------------------------

export interface PdfMetadata {
  title: string;
  author: string;
  producer: string;
  creationDate: string;
}

export interface PendingSubmission {
  id: string;                    // Firestore doc ID
  userId: string;
  barangay: string;
  fullName: string;
  category: 'scheduled' | 'asap' | 'perennial';
  documentType: string;
  documentLabel: string;
  period: string;                // e.g., "2026-Q1", "2026-04", "ASAP"
  year: number;
  fileStoragePath: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  pdfMetadata: PdfMetadata;
  submittedAt: any;              // Firestore Timestamp
}

export interface ApprovedSubmission extends PendingSubmission {
  approvedAt: any;               // Firestore Timestamp
  approvedBy: string;            // Admin UID
}

export interface AccomplishmentReports {
  activeCitizenship: number;
  agriculture: number;
  economicEmpowerment: number;
  education: number;
  environment: number;
  globalMobility: number;
  governance: number;
  health: number;
  peaceBuildingAndSecurity: number;
  socialInclusionAndEquity: number;
}

export interface PerennialCounts {
  userId: string;
  barangay: string;
  fullName: string;
  year: number;
  resolutions: number;
  accomplishmentReports: AccomplishmentReports;
  updatedAt: any;                // Firestore Timestamp
}

/** Default empty accomplishment reports object. */
export const EMPTY_ACCOMPLISHMENT_REPORTS: AccomplishmentReports = {
  activeCitizenship: 0,
  agriculture: 0,
  economicEmpowerment: 0,
  education: 0,
  environment: 0,
  globalMobility: 0,
  governance: 0,
  health: 0,
  peaceBuildingAndSecurity: 0,
  socialInclusionAndEquity: 0,
};
