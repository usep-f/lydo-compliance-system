import React, { useState, useMemo } from 'react';
import { Modal, Button, Form, Row, Col, Spinner, Card } from 'react-bootstrap';
import { BARANGAYS } from '../../constants/barangays';
import {
  type HistoricalSubmission,
  type PendingSubmission,
} from '../../constants/submissionTypes';
import { useComplianceData, type ComplianceData } from '../../hooks/useComplianceData';
import {
  generateFormalPdfReport,
  type ReportProfileType,
  type PaperSizeType,
} from '../../utils/pdfReportUtils';
import { exportAnalyticsSummaryCsv, exportFilteredSubmissionsCsv } from '../../utils/csvUtils';
import { useToast } from '../../context/ToastContext';

/* ─────────────────────────────────────────────
   Props & Interfaces
───────────────────────────────────────────── */

interface ExportReportModalProps {
  show: boolean;
  onHide: () => void;
  adminName: string;
  compliance?: ComplianceData;
  pendingSubmissions: PendingSubmission[];
  historySubmissions: HistoricalSubmission[];
  currentYear: number;
  initialBarangay?: string;
}

interface SectionItem {
  key: 'kpis' | 'charts' | 'matrix' | 'submissions';
  title: string;
  desc: string;
  icon: string;
  color: string;
  bgColor: string;
}

const SECTION_ITEMS: SectionItem[] = [
  {
    key: 'kpis',
    title: 'Executive KPIs',
    desc: 'Scorecard & rates',
    icon: 'speed',
    color: '#006EB7',
    bgColor: '#E0F2FE',
  },
  {
    key: 'charts',
    title: 'Panoramic Visuals',
    desc: 'Neon gauges & trends',
    icon: 'monitoring',
    color: '#2563EB',
    bgColor: '#DBEAFE',
  },
  {
    key: 'matrix',
    title: 'Compliance Matrix',
    desc: 'Document checklist',
    icon: 'grid_on',
    color: '#059669',
    bgColor: '#D1FAE5',
  },
  {
    key: 'submissions',
    title: 'Submission Logs',
    desc: 'Audit trail history',
    icon: 'history_edu',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
];

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

/** Report Profile Preset Selector */
const ProfilePresetCard: React.FC<{
  selectedProfile: ReportProfileType;
  onSelectProfile: (p: ReportProfileType) => void;
}> = ({ selectedProfile, onSelectProfile }) => (
  <div className="mb-3">
    <div className="d-flex align-items-center justify-content-between mb-2">
      <div className="d-flex align-items-center gap-2">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>
          auto_awesome
        </span>
        <span className="fw-bold" style={{ fontSize: '13px', color: '#1E293B', fontFamily: 'var(--font-headline)' }}>
          Report Profile &amp; Layout Engine
        </span>
      </div>
      <span className="text-muted" style={{ fontSize: '11px' }}>
        Horizontal panoramic mode active
      </span>
    </div>

    <Row className="g-2">
      <Col md={4}>
        <div
          onClick={() => onSelectProfile('dossier')}
          role="button"
          tabIndex={0}
          className="p-2.5 h-100 position-relative transition-all"
          style={{
            borderRadius: '10px',
            border: selectedProfile === 'dossier' ? '2px solid #2563EB' : '1px solid #E2E8F0',
            background: selectedProfile === 'dossier' ? '#EFF6FF' : '#FFFFFF',
            boxShadow: selectedProfile === 'dossier' ? '0 2px 8px rgba(37, 99, 235, 0.14)' : 'none',
            cursor: 'pointer',
            padding: '10px 12px',
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-1">
            <span className="badge bg-primary" style={{ fontSize: '9.5px', fontWeight: 600 }}>Landscape · Recommended</span>
            {selectedProfile === 'dossier' && (
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>check_circle</span>
            )}
          </div>
          <div className="fw-bold text-dark mb-1" style={{ fontSize: '12.5px' }}>Horizontal Executive Dossier</div>
          <div className="text-muted" style={{ fontSize: '10.5px', lineHeight: 1.35 }}>
            Panoramic wide layout with floating-arc neon gauges, wave area timelines, and full compliance registers.
          </div>
        </div>
      </Col>

      <Col md={4}>
        <div
          onClick={() => onSelectProfile('executive')}
          role="button"
          tabIndex={0}
          className="p-2.5 h-100 position-relative transition-all"
          style={{
            borderRadius: '10px',
            border: selectedProfile === 'executive' ? '2px solid #2563EB' : '1px solid #E2E8F0',
            background: selectedProfile === 'executive' ? '#EFF6FF' : '#FFFFFF',
            boxShadow: selectedProfile === 'executive' ? '0 2px 8px rgba(37, 99, 235, 0.14)' : 'none',
            cursor: 'pointer',
            padding: '10px 12px',
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-1">
            <span className="badge bg-dark" style={{ fontSize: '9.5px', fontWeight: 600 }}>Landscape · Compact</span>
            {selectedProfile === 'executive' && (
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>check_circle</span>
            )}
          </div>
          <div className="fw-bold text-dark mb-1" style={{ fontSize: '12.5px' }}>Panoramic Executive Brief</div>
          <div className="text-muted" style={{ fontSize: '10.5px', lineHeight: 1.35 }}>
            Concise horizontal report focusing strictly on macro KPI scorecards and statutory matrix tables.
          </div>
        </div>
      </Col>

      <Col md={4}>
        <div
          onClick={() => onSelectProfile('custom')}
          role="button"
          tabIndex={0}
          className="p-2.5 h-100 position-relative transition-all"
          style={{
            borderRadius: '10px',
            border: selectedProfile === 'custom' ? '2px solid #2563EB' : '1px solid #E2E8F0',
            background: selectedProfile === 'custom' ? '#EFF6FF' : '#FFFFFF',
            boxShadow: selectedProfile === 'custom' ? '0 2px 8px rgba(37, 99, 235, 0.14)' : 'none',
            cursor: 'pointer',
            padding: '10px 12px',
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-1">
            <span className="badge bg-secondary" style={{ fontSize: '9.5px', fontWeight: 600 }}>Custom Selection</span>
            {selectedProfile === 'custom' && (
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>check_circle</span>
            )}
          </div>
          <div className="fw-bold text-dark mb-1" style={{ fontSize: '12.5px' }}>Custom Modular</div>
          <div className="text-muted" style={{ fontSize: '10.5px', lineHeight: 1.35 }}>
            Fine-tune and toggle exact report sections and tables to customize the output document.
          </div>
        </div>
      </Col>
    </Row>
  </div>
);

/** Scope & Filter Settings Card */
const ScopeFilterCard: React.FC<{
  selectedBarangay: string;
  setSelectedBarangay: (v: string) => void;
  selectedYear: number;
  setSelectedYear: (v: number) => void;
  selectedPaperSize: PaperSizeType;
  setSelectedPaperSize: (v: PaperSizeType) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  currentYear: number;
}> = ({
  selectedBarangay,
  setSelectedBarangay,
  selectedYear,
  setSelectedYear,
  selectedPaperSize,
  setSelectedPaperSize,
  statusFilter,
  setStatusFilter,
  currentYear,
}) => (
  <Card className="border mb-3" style={{ borderRadius: '12px', background: '#F8FAFC', borderColor: '#E2E8F0' }}>
    <Card.Body className="p-3">
      <div className="d-flex align-items-center gap-2 mb-2 pb-1 border-bottom" style={{ borderColor: '#E2E8F0' }}>
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>
          tune
        </span>
        <span className="fw-bold" style={{ fontSize: '13px', color: '#1E293B', fontFamily: 'var(--font-headline)' }}>
          Scope, Paper Format &amp; Data Filters
        </span>
      </div>
      <Row className="g-2">
        <Col md={4}>
          <Form.Group>
            <Form.Label className="mb-1" style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
              Target Scope (Barangay)
            </Form.Label>
            <Form.Select
              size="sm"
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              style={{ borderRadius: '8px', fontSize: '12px', borderColor: '#CBD5E1' }}
            >
              <option value="all">All Barangays (Municipal Overview)</option>
              {BARANGAYS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={2}>
          <Form.Group>
            <Form.Label className="mb-1" style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
              Calendar Year
            </Form.Label>
            <Form.Select
              size="sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ borderRadius: '8px', fontSize: '12px', borderColor: '#CBD5E1' }}
            >
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear - 1}>{currentYear - 1}</option>
              <option value={currentYear - 2}>{currentYear - 2}</option>
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={3}>
          <Form.Group>
            <Form.Label className="mb-1" style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
              Paper Format
            </Form.Label>
            <Form.Select
              size="sm"
              value={selectedPaperSize}
              onChange={(e) => setSelectedPaperSize(e.target.value as PaperSizeType)}
              style={{ borderRadius: '8px', fontSize: '12px', borderColor: '#CBD5E1' }}
            >
              <option value="legal">Philippine Legal (13″ × 8.5″ Landscape)</option>
              <option value="a4">A4 Standard (297 × 210 mm Landscape)</option>
              <option value="letter">US Letter (11″ × 8.5″ Landscape)</option>
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={3}>
          <Form.Group>
            <Form.Label className="mb-1" style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
              Log Status Filter
            </Form.Label>
            <Form.Select
              size="sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ borderRadius: '8px', fontSize: '12px', borderColor: '#CBD5E1' }}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved Only</option>
              <option value="pending">Pending Only</option>
              <option value="denied">Denied Only</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
    </Card.Body>
  </Card>
);

/** Interactive Section Selection Grid */
const SectionSelectionGrid: React.FC<{
  sections: { kpis: boolean; charts: boolean; matrix: boolean; submissions: boolean };
  onToggle: (key: 'kpis' | 'charts' | 'matrix' | 'submissions') => void;
}> = ({ sections, onToggle }) => (
  <div className="mb-3">
    <div className="d-flex align-items-center justify-content-between mb-2">
      <div className="d-flex align-items-center gap-2">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>
          checklist
        </span>
        <span className="fw-bold" style={{ fontSize: '13px', color: '#1E293B', fontFamily: 'var(--font-headline)' }}>
          Modular Report Sections (PDF)
        </span>
      </div>
      <span className="text-muted" style={{ fontSize: '11px' }}>
        Click card to toggle inclusion
      </span>
    </div>

    <Row className="g-2">
      {SECTION_ITEMS.map((item) => {
        const isChecked = sections[item.key];
        return (
          <Col xs={6} md={3} key={item.key}>
            <div
              onClick={() => onToggle(item.key)}
              role="button"
              tabIndex={0}
              className="p-2 h-100 position-relative transition-all"
              style={{
                borderRadius: '10px',
                border: isChecked ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                background: isChecked ? '#EFF6FF' : '#FFFFFF',
                boxShadow: isChecked ? '0 2px 6px rgba(37, 99, 235, 0.12)' : 'none',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div className="d-flex align-items-start justify-content-between mb-1">
                <div
                  className="d-flex align-items-center justify-content-center rounded-2"
                  style={{ width: '28px', height: '28px', background: item.bgColor, color: item.color }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                    {item.icon}
                  </span>
                </div>
                <Form.Check
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  style={{ pointerEvents: 'none' }}
                />
              </div>
              <div className="fw-bold text-dark" style={{ fontSize: '12px' }}>
                {item.title}
              </div>
              <div className="text-muted" style={{ fontSize: '10.5px' }}>
                {item.desc}
              </div>
            </div>
          </Col>
        );
      })}
    </Row>
  </div>
);

/** Status & Summary Ribbon */
const SummaryRibbon: React.FC<{
  isAll: boolean;
  selectedBarangay: string;
  selectedPaperSize: PaperSizeType;
  matchCount: number;
}> = ({ isAll, selectedBarangay, selectedPaperSize, matchCount }) => (
  <div
    className="d-flex align-items-center justify-content-between p-2 px-3 rounded"
    style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569' }}
  >
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <span className="badge" style={{ background: '#2563EB', color: '#FFFFFF', fontWeight: 600, fontSize: '11px' }}>
        {isAll ? 'Scope: All Barangays' : `Scope: ${selectedBarangay}`}
      </span>
      <span className="badge bg-dark" style={{ fontSize: '11px' }}>
        {selectedPaperSize === 'legal' ? 'Philippine Legal (13″×8.5″)' : selectedPaperSize === 'a4' ? 'A4 Landscape' : 'Letter Landscape'}
      </span>
      <span className="badge bg-secondary" style={{ fontSize: '11px' }}>
        Orientation: Landscape Horizontal
      </span>
      <span>
        <strong>Matching Records:</strong> {matchCount} filings
      </span>
    </div>
    <span className="text-muted d-inline-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10B981' }}>
        verified_user
      </span>
      Ultra-HD 300 DPI Generation
    </span>
  </div>
);

/* ─────────────────────────────────────────────
   Main ExportReportModal Component
───────────────────────────────────────────── */

export default function ExportReportModal({
  show,
  onHide,
  adminName,
  compliance: passedCompliance,
  pendingSubmissions,
  historySubmissions,
  currentYear,
  initialBarangay = '',
}: ExportReportModalProps) {
  const { addToast } = useToast();

  // Profile State (Default to Dossier for rich multi-page panoramic landscape)
  const [selectedProfile, setSelectedProfile] = useState<ReportProfileType>('dossier');

  // Scope, Year & Paper Format States with clean props-to-state derivation
  const [overrideBarangay, setOverrideBarangay] = useState<string | null>(null);
  const [overrideYear, setOverrideYear] = useState<number | null>(null);
  const [selectedPaperSize, setSelectedPaperSize] = useState<PaperSizeType>('legal');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const selectedBarangay = overrideBarangay !== null
    ? overrideBarangay
    : (initialBarangay && initialBarangay.trim() !== '' ? initialBarangay : 'all');
  const selectedYear = overrideYear !== null ? overrideYear : currentYear;

  const setSelectedBarangay = (b: string) => setOverrideBarangay(b);
  const setSelectedYear = (y: number) => setOverrideYear(y);

  const handleClose = () => {
    setOverrideBarangay(null);
    setOverrideYear(null);
    setStatusFilter('all');
    onHide();
  };

  // Modular Section Toggles
  const [sections, setSections] = useState({
    kpis: true,
    charts: true,
    matrix: true,
    submissions: true,
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const handleSelectProfile = (profile: ReportProfileType) => {
    setSelectedProfile(profile);
    if (profile === 'executive') {
      setSections({ kpis: true, charts: true, matrix: true, submissions: false });
    } else if (profile === 'dossier') {
      setSections({ kpis: true, charts: true, matrix: true, submissions: true });
    }
  };

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
    if (selectedProfile !== 'custom') {
      setSelectedProfile('custom');
    }
  };

  // Extract approved and denied historical submissions
  const approved = useMemo(
    () => historySubmissions.filter((s) => s.status === 'approved' || (!s.status && s.approvedAt)),
    [historySubmissions]
  );
  const denied = useMemo(
    () => historySubmissions.filter((s) => s.status === 'denied'),
    [historySubmissions]
  );

  // Active barangays for compliance calculation
  const activeBarangays = useMemo(
    () => (selectedBarangay && selectedBarangay !== 'all' ? [selectedBarangay] : BARANGAYS),
    [selectedBarangay]
  );

  const filteredPendingForCompliance = useMemo(
    () => (selectedBarangay && selectedBarangay !== 'all'
      ? pendingSubmissions.filter((s) => s.barangay?.trim() === selectedBarangay.trim())
      : pendingSubmissions),
    [pendingSubmissions, selectedBarangay]
  );

  // Dynamically compute compliance data for selected year and scope
  const modalCompliance = useComplianceData(
    selectedYear,
    filteredPendingForCompliance,
    approved,
    activeBarangays,
    'year',
    denied
  );

  const activeCompliance = modalCompliance || passedCompliance;

  // Filtered submissions list
  const filteredSubmissions = useMemo(() => {
    const all = [...pendingSubmissions, ...historySubmissions];
    return all.filter((s) => {
      const matchBrgy = selectedBarangay === 'all' || s.barangay?.trim() === selectedBarangay.trim();
      const matchYear = !s.year || Number(s.year) === selectedYear;
      const anySub = s as unknown as { status?: string; approvedAt?: unknown; deniedAt?: unknown };
      const computedStatus = anySub.status || (anySub.approvedAt ? 'approved' : anySub.deniedAt ? 'denied' : 'pending');
      const matchStatus = statusFilter === 'all' || computedStatus === statusFilter;
      return matchBrgy && matchYear && matchStatus;
    });
  }, [pendingSubmissions, historySubmissions, selectedBarangay, selectedYear, statusFilter]);

  const isAll = selectedBarangay === 'all';

  /* ─────────────────────────────────────────────
     Action Handlers
  ───────────────────────────────────────────── */

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateFormalPdfReport({
        year: selectedYear,
        scope: selectedBarangay,
        profile: selectedProfile,
        paperSize: selectedPaperSize,
        orientation: 'landscape',
        adminName,
        sections,
        compliance: activeCompliance,
        submissions: filteredSubmissions,
      });

      addToast('Official landscape compliance PDF report successfully generated!', 'success');
    } catch (err) {
      console.error('Error generating PDF report:', err);
      addToast('Failed to generate PDF report. Please try again.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportAnalyticsCsv = () => {
    try {
      exportAnalyticsSummaryCsv(selectedYear, selectedBarangay, activeCompliance);
      addToast('Analytics summary CSV downloaded successfully.', 'success');
    } catch (err) {
      console.error('Error exporting analytics CSV:', err);
      addToast('Failed to export analytics CSV.', 'error');
    }
  };

  const handleExportSubmissionsCsv = () => {
    try {
      const suffix = isAll ? `All_${selectedYear}` : `${selectedBarangay.replace(/\s+/g, '_')}_${selectedYear}`;
      exportFilteredSubmissionsCsv(filteredSubmissions, suffix);
      addToast('Submission logs CSV downloaded successfully.', 'success');
    } catch (err) {
      console.error('Error exporting submissions CSV:', err);
      addToast('Failed to export submission logs CSV.', 'error');
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      centered
      backdrop="static"
      contentClassName="border-0 shadow-lg rounded-4 overflow-hidden"
    >
      {/* Header with LYDO Deep Brand Gradient */}
      <div
        style={{
          background: 'linear-gradient(135deg, #00426E 0%, #2563EB 100%)',
          padding: '20px 24px',
          position: 'relative',
        }}
      >
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              <span
                className="material-symbols-outlined text-white"
                style={{ fontSize: '26px', fontVariationSettings: "'FILL' 1" }}
              >
                summarize
              </span>
            </div>
            <div>
              <Modal.Title
                style={{
                  fontSize: '19px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-headline)',
                  letterSpacing: '0.02em',
                }}
              >
                Export &amp; Report Generator Hub
              </Modal.Title>
              <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', fontFamily: 'var(--font-body)' }}>
                Compile panoramic landscape compliance dossiers and structured data archives
              </div>
            </div>
          </div>

          <Button
            variant="link"
            onClick={handleClose}
            className="p-1 text-white text-decoration-none d-flex align-items-center justify-content-center"
            style={{
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              background: 'rgba(255, 255, 255, 0.1)',
              transition: 'background 0.15s ease',
            }}
            title="Close modal"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </Button>
        </div>
      </div>

      <Modal.Body className="p-4" style={{ background: '#FFFFFF' }}>
        {/* 1. Report Profile Preset Selection */}
        <ProfilePresetCard
          selectedProfile={selectedProfile}
          onSelectProfile={handleSelectProfile}
        />

        {/* 2. Scope, Paper Size & Filter Controls */}
        <ScopeFilterCard
          selectedBarangay={selectedBarangay}
          setSelectedBarangay={setSelectedBarangay}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedPaperSize={selectedPaperSize}
          setSelectedPaperSize={setSelectedPaperSize}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          currentYear={currentYear}
        />

        {/* 3. Interactive Modular Section Toggles */}
        <SectionSelectionGrid sections={sections} onToggle={toggleSection} />

        {/* 4. Records preview & Security status */}
        <SummaryRibbon
          isAll={isAll}
          selectedBarangay={selectedBarangay}
          selectedPaperSize={selectedPaperSize}
          matchCount={filteredSubmissions.length}
        />
      </Modal.Body>

      <Modal.Footer
        style={{
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          padding: '14px 24px',
        }}
      >
        <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small fw-semibold d-none d-sm-inline" style={{ fontSize: '12px' }}>
              Spreadsheets:
            </span>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleExportAnalyticsCsv}
              className="d-inline-flex align-items-center gap-1 shadow-none"
              style={{ borderRadius: '8px', fontSize: '12.5px', fontWeight: 600 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                table_chart
              </span>
              Analytics CSV
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleExportSubmissionsCsv}
              className="d-inline-flex align-items-center gap-1 shadow-none"
              style={{ borderRadius: '8px', fontSize: '12.5px', fontWeight: 600 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                receipt_long
              </span>
              Submissions CSV
            </Button>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Button
              variant="light"
              size="sm"
              onClick={handleClose}
              className="border"
              style={{ borderRadius: '8px', fontSize: '12.5px', fontWeight: 500, color: '#334155' }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="d-inline-flex align-items-center gap-2 px-3 shadow-sm"
              style={{
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #2563EB 0%, #00426E 100%)',
                border: 'none',
              }}
            >
              {isGeneratingPdf ? (
                <>
                  <Spinner size="sm" animation="border" />
                  <span>Compiling 300 DPI PDF...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    picture_as_pdf
                  </span>
                  <span>Download Landscape PDF</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

