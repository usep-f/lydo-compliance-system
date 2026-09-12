import jsPDF from 'jspdf';
import type { ComplianceData } from '../hooks/useComplianceData';
import type { HistoricalSubmission, PendingSubmission } from '../constants/submissionTypes';
import {
  buildExecutiveBriefLayout,
  buildAuditDossierLayout,
} from './pdfLayoutBuilders';

/* ─────────────────────────────────────────────
   Interfaces & Types
───────────────────────────────────────────── */

export type ReportProfileType = 'executive' | 'dossier' | 'custom';

export interface PdfChartFigure {
  title: string;
  subtitle?: string;
  dataUrl: string;
  heightPt?: number;
}

export interface PdfReportOptions {
  year: number;
  scope: string; // 'all' or specific barangay name
  profile?: ReportProfileType;
  orientation?: 'portrait' | 'landscape';
  adminName?: string;
  sections: {
    kpis: boolean;
    charts: boolean;
    matrix: boolean;
    submissions: boolean;
  };
  charts: PdfChartFigure[];
  compliance: ComplianceData;
  submissions: (HistoricalSubmission | PendingSubmission)[];
}

/* ─────────────────────────────────────────────
   Main Export Orchestrator
───────────────────────────────────────────── */

/**
 * Generate and trigger browser download of official PDF report.
 * Supports adaptive orientation:
 * - 'executive': Portrait A4, 1-2 pages concise briefing
 * - 'dossier': Landscape A4, multi-page deep dive with hybrid charts & tables
 */
export const generateFormalPdfReport = async (options: PdfReportOptions): Promise<void> => {
  const profile = options.profile || 'executive';
  const orientation = options.orientation || (profile === 'dossier' ? 'landscape' : 'portrait');

  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: 'a4',
  });

  // Delegate to profile-specific layout coordinator
  if (orientation === 'landscape') {
    buildAuditDossierLayout(doc, { ...options, profile, orientation });
  } else {
    buildExecutiveBriefLayout(doc, { ...options, profile, orientation });
  }

  // Generate clean filename
  const isAll = options.scope === 'all' || !options.scope;
  const scopeTag = isAll ? 'All_Barangays' : options.scope.replace(/\s+/g, '_');
  const dateTag = new Date().toISOString().split('T')[0];
  const profileTag = profile === 'dossier' ? 'Audit_Dossier' : 'Executive_Brief';

  doc.save(`LYDO_${profileTag}_${scopeTag}_CY${options.year}_${dateTag}.pdf`);
};
