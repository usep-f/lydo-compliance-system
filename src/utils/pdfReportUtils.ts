import jsPDF from 'jspdf';
import type { ComplianceData } from '../hooks/useComplianceData';
import type { HistoricalSubmission, PendingSubmission } from '../constants/submissionTypes';
import { ACCOMPLISHMENT_CATEGORIES } from '../constants/submissionTypes';
import {
  buildAuditDossierLayout,
  buildExecutiveBriefLayout,
} from './pdfLayoutBuilders';
import {
  renderComplianceRadialGauge,
  renderSubmissionActivityWave,
  renderDocTypeHorizontalMatrix,
  renderDenialInfographic,
  renderYouthAccomplishmentTracks,
  renderAccomplishmentShareDonut,
} from './pdfChartRenderers';
import lydoLogoUrl from '../assets/lydo-logo.webp';

/* ─────────────────────────────────────────────
   Interfaces & Types
───────────────────────────────────────────── */

export type ReportProfileType = 'executive' | 'dossier' | 'custom';
export type PaperSizeType = 'legal' | 'a4' | 'letter';

export interface PaperGeometry {
  width: number;
  height: number;
  name: string;
}

/** Deterministic geometry dimensions (pt @ 72 dpi) */
export const PAPER_GEOMETRIES: Record<PaperSizeType, PaperGeometry> = {
  legal: { width: 612, height: 936, name: 'Philippine Legal (8.5″ × 13″)' },
  a4: { width: 595.28, height: 841.89, name: 'A4 Standard (210 × 297 mm)' },
  letter: { width: 612, height: 792, name: 'US Letter (8.5″ × 11″)' },
};

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
  paperSize?: PaperSizeType;
  orientation?: 'portrait' | 'landscape';
  adminName?: string;
  logoDataUrl?: string | null;
  sections: {
    kpis: boolean;
    charts: boolean;
    matrix: boolean;
    submissions: boolean;
  };
  charts?: PdfChartFigure[];
  compliance: ComplianceData;
  submissions: (HistoricalSubmission | PendingSubmission)[];
}

/* ─────────────────────────────────────────────
   Logo Preloader Helper
───────────────────────────────────────────── */

/**
 * Converts LYDO webp asset into a high-fidelity PNG data URL for jsPDF embedding
 */
export const loadLydoLogoBase64 = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = lydoLogoUrl;
    } catch {
      resolve(null);
    }
  });
};

/* ─────────────────────────────────────────────
   Main Export Orchestrator
───────────────────────────────────────────── */

/**
 * Generate and trigger browser download of publication-grade official PDF report.
 * Defaults to Horizontal/Landscape alignment on Philippine Legal (13" x 8.5" / 936 x 612 pt).
 */
export const generateFormalPdfReport = async (options: PdfReportOptions): Promise<void> => {
  const profile = options.profile || 'executive';
  // Default to landscape horizontal alignment for wide panoramic readability
  const orientation = options.orientation || 'landscape';
  const paperSizeKey = options.paperSize || 'legal';
  const geometry = PAPER_GEOMETRIES[paperSizeKey] || PAPER_GEOMETRIES.legal;

  // Resolve dimensions based on orientation
  const pageFormat = orientation === 'landscape'
    ? [geometry.height, geometry.width]
    : [geometry.width, geometry.height];

  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: pageFormat,
  });

  // Pre-fetch high quality PNG logo if not provided
  let logoUrl = options.logoDataUrl;
  if (!logoUrl) {
    logoUrl = await loadLydoLogoBase64();
  }

  // Generate publication-grade in-memory charts if not supplied
  const figures: PdfChartFigure[] = options.charts && options.charts.length > 0 ? [...options.charts] : [];
  if (options.sections.charts && figures.length === 0) {
    const isAll = options.scope === 'all' || !options.scope;
    const totalDenied = options.compliance.denialReasonShare.reduce((s, d) => s + d.count, 0);

    // 1. Overall Compliance Radial Gauge & Metric Breakdown
    figures.push({
      title: 'Overall Compliance Status Distribution',
      dataUrl: renderComplianceRadialGauge(options.compliance, options.scope),
      heightPt: 340,
    });

    // 2. 12-Month Submission Activity Waveform
    figures.push({
      title: 'Annual Submission Activity Timeline (12 Months)',
      dataUrl: renderSubmissionActivityWave(options.compliance.monthlyTrend),
      heightPt: 340,
    });

    // 3. Document Type Compliance Horizontal Progress Matrix
    figures.push({
      title: 'Document Type Compliance Breakdown',
      dataUrl: renderDocTypeHorizontalMatrix(options.compliance.docTypeCompliance),
      heightPt: 270,
    });

    // 4. Categorical Denial & Deficiency Audit Infographic
    figures.push({
      title: 'Categorical Denial Reason Share',
      dataUrl: renderDenialInfographic(options.compliance.denialReasonShare, totalDenied),
      heightPt: 270,
    });

    // 5. 10 Youth Development Statutory Priorities
    const youthSummary = isAll
      ? ACCOMPLISHMENT_CATEGORIES.map((cat) => {
          const item = options.compliance.overallPerennialSummary.items.find((i) => i.id === cat.id);
          const approved = item?.approved ?? 0;
          const denied = item?.denied ?? 0;
          const submitted = item?.submitted ?? (approved + (item?.pending ?? 0) + denied);
          return { label: cat.label, submitted, approved, denied };
        })
      : (() => {
          const entry = options.compliance.barangayPerennialSummary.find((s) => s.barangay === options.scope);
          return ACCOMPLISHMENT_CATEGORIES.map((cat) => {
            const item = entry?.categoryData.find((c) => c.id === cat.id);
            const approved = item?.approved ?? 0;
            const denied = item?.denied ?? 0;
            const submitted = item?.submitted ?? (approved + (item?.pending ?? 0) + denied);
            return { label: cat.label, submitted, approved, denied };
          });
        })();

    figures.push({
      title: 'Accomplishment Filings by Priority Area (10 Areas)',
      dataUrl: renderYouthAccomplishmentTracks(youthSummary),
      heightPt: 265,
    });

    // 6. Accomplishment Category Share Donut
    figures.push({
      title: 'Approved Accomplishment Share',
      dataUrl: renderAccomplishmentShareDonut(options.compliance.accomplishmentApprovalShare),
      heightPt: 265,
    });
  }

  const enrichedOptions: PdfReportOptions = {
    ...options,
    profile,
    orientation,
    paperSize: paperSizeKey,
    logoDataUrl: logoUrl,
    charts: figures,
  };

  // Delegate to profile-specific layout coordinator
  if (orientation === 'landscape') {
    buildAuditDossierLayout(doc, enrichedOptions);
  } else {
    buildExecutiveBriefLayout(doc, enrichedOptions);
  }

  // Generate official standard filename
  const isAll = options.scope === 'all' || !options.scope;
  const scopeTag = isAll ? 'All_Barangays' : options.scope.replace(/\s+/g, '_');
  const dateTag = new Date().toISOString().split('T')[0];
  const profileTag = profile === 'dossier' ? 'Audit_Dossier' : 'Executive_Report';

  doc.save(`LYDO_${profileTag}_${scopeTag}_CY${options.year}_${dateTag}.pdf`);
};
