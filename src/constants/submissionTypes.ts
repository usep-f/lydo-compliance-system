// ---------------------------------------------------------------------------
// Submission Type Definitions — Single Source of Truth
// ---------------------------------------------------------------------------

import { Timestamp } from 'firebase/firestore';

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
  documentType: string;          // e.g., 'full_disclosure'
  documentLabel: string;         // user-friendly
  period: string;                // e.g., '2026-Q1', 'ASAP'
  year: number;
  accomplishmentCategory?: string | null; // e.g., 'agriculture'
  fileName: string;
  fileSize: number;
  fileStoragePath: string;
  fileUrl: string;
  pageCount: number;
  pdfMetadata?: PdfMetadata;
  status: 'pending';
  submittedAt: Timestamp;        // Firestore Timestamp
}

export interface HistoricalSubmission {
  id: string;
  userId: string;
  barangay: string;
  fullName: string;
  category: 'scheduled' | 'asap' | 'perennial';
  documentType: string;
  documentLabel: string;
  period: string;
  year: number;
  accomplishmentCategory?: string | null;
  fileName: string;
  fileSize: number;
  fileStoragePath: string | null; // Null if denied and file deleted
  fileUrl: string | null;         // Null if denied and file deleted
  pageCount: number;
  pdfMetadata?: PdfMetadata;
  status: 'approved' | 'denied';
  submittedAt: Timestamp;
  approvedAt?: Timestamp;        // Firestore Timestamp (if approved)
  approvedBy?: string;           // Admin's UID (if approved)
  deniedAt?: Timestamp;          // Firestore Timestamp (if denied)
  deniedBy?: string;             // Admin's UID (if denied)
  reviewNotes?: string;          // Reason for denial
  denialCategory?: DenialCategory; // Categorical reason for denial
}

export const DENIAL_CATEGORIES = [
  'Missing Signatures / Endorsements',
  'Incomplete Content / Missing Attachments',
  'Non-compliant with Official Template / Format',
  'Invalid or Incorrect Period / Year',
  'Content Inaccuracies / Data Discrepancies',
  'Other / Specific Discrepancy',
] as const;

export type DenialCategory = typeof DENIAL_CATEGORIES[number];

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
  updatedAt: Timestamp;          // Firestore Timestamp
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

// ---------------------------------------------------------------------------
// Youth Organization Accreditation Types & Constants
// ---------------------------------------------------------------------------

export const ACCREDITATION_CLASSIFICATIONS = [
  'Community-Based',
  'School-Based',
  'Faith-Based',
  'Special Interest',
] as const;

export type AccreditationClassification = typeof ACCREDITATION_CLASSIFICATIONS[number];

export const ACCREDITATION_DOC_TYPES = [
  'letterOfIntent',
  'applicationForm',
  'listOfficers',
  'listMembers',
  'constitutionAndBylaws',
] as const;

export type AccreditationDocType = typeof ACCREDITATION_DOC_TYPES[number];

export interface AccreditationDocRequirement {
  id: AccreditationDocType;
  label: string;
  description: string;
  icon: string;
}

export const ACCREDITATION_DOC_REQUIREMENTS: AccreditationDocRequirement[] = [
  {
    id: 'letterOfIntent',
    label: 'Letter of Intent',
    description: 'Formal letter addressed to LYDO expressing intent to register and accredit the youth organization.',
    icon: 'mail',
  },
  {
    id: 'applicationForm',
    label: 'Official Application Form',
    description: 'Accomplished Youth Organization Registration / Accreditation application form.',
    icon: 'assignment',
  },
  {
    id: 'listOfficers',
    label: 'Directory of Officers',
    description: 'Complete list of elected/appointed officers with designations and contact details.',
    icon: 'badge',
  },
  {
    id: 'listMembers',
    label: 'Roster of Members',
    description: 'Official list of registered youth members residing or studying in the locality.',
    icon: 'groups',
  },
  {
    id: 'constitutionAndBylaws',
    label: 'Constitution & By-Laws (CBL)',
    description: 'Governing constitution, mission, vision, and internal operating rules of the organization.',
    icon: 'gavel',
  },
];

export interface AccreditationDocMeta {
  storagePath: string;
  fileName: string;
  fileSize: number;
  pageCount?: number;
  fileUrl?: string | null;
}

export interface DeliberationSchedule {
  date: string;                      // e.g. "2026-10-15"
  time: string;                      // e.g. "09:30 AM"
  venue: string;                     // e.g. "LYDO Session Hall, 2nd Floor"
  instructions?: string;             // Custom instructions or documents to bring
  scheduledBy: string;               // Admin UID
  scheduledAt: Timestamp;
}

export type AccreditationStatus = 'pending' | 'verified' | 'revision_requested' | 'disapproved';

export interface AccreditationApplication {
  id: string;
  orgName: string;
  classification: AccreditationClassification;
  barangay: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  documents: Record<AccreditationDocType, AccreditationDocMeta>;
  status: AccreditationStatus;
  deliberationSchedule?: DeliberationSchedule;
  rejectionReason?: string;
  revisionRemarks?: string;
  flaggedDocs?: AccreditationDocType[];
  submittedAt: Timestamp;
  updatedAt: Timestamp;
}

