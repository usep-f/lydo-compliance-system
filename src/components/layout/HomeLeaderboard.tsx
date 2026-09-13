import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Table, Button, Modal, Badge, Spinner } from 'react-bootstrap';
import type { PublicAnalytics } from '../../hooks/usePublicAnalytics';
import { BARANGAYS } from '../../constants/barangays';
import { SCHEDULED_TYPES, ASAP_TYPES } from '../../constants/submissionTypes';

interface HomeLeaderboardProps {
  analytics: PublicAnalytics | null;
  loading: boolean;
  userBarangay?: string | null;
}

export const HomeLeaderboard: React.FC<HomeLeaderboardProps> = ({ analytics, loading, userBarangay }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'top' | 'bottom'>('top');
  const [selectedBarangay, setSelectedBarangay] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Compute leaderboard dataset
  const leaderboardDataset = useMemo(() => {
    if (analytics && analytics.barangayRanking && analytics.barangayRanking.length > 0) {
      return analytics.barangayRanking.map(b => ({
        barangay: b.barangay,
        rate: b.complianceRate
      }));
    }
    // Fallback: list all 33 barangays so table is never empty/broken
    return BARANGAYS.map(b => ({
      barangay: b,
      rate: 0
    }));
  }, [analytics]);

  // Filtered leaderboard list based on search query and Top 5 / Bottom 5 filters
  const filteredDataset = useMemo(() => {
    if (searchTerm.trim() !== '') {
      return leaderboardDataset.filter(item => 
        item.barangay.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterType === 'top') {
      return leaderboardDataset.slice(0, 5);
    } else {
      const bottomFive = leaderboardDataset.slice(-5);
      return [...bottomFive].reverse();
    }
  }, [leaderboardDataset, searchTerm, filterType]);

  // Open checklist detail modal for a Barangay
  const handleOpenDetail = (barangay: string) => {
    setSelectedBarangay(barangay);
    setShowModal(true);
  };

  // Get active selected barangay data details
  const detailsData = useMemo(() => {
    if (!selectedBarangay) return null;

    const breakdown = analytics?.barangayBreakdown?.[selectedBarangay];
    const rate = breakdown ? breakdown.complianceRate : 0;

    const scheduled: { docType: string; label: string; period: string; status: string }[] = [];
    const asap: { docType: string; label: string; status: string }[] = [];

    if (breakdown && breakdown.checklist) {
      // Parse checklist keys
      Object.entries(breakdown.checklist).forEach(([key, status]) => {
        if (key.endsWith('_ASAP')) {
          const docType = key.replace('_ASAP', '');
          asap.push({
            docType,
            label: ASAP_TYPES.find(t => t.id === docType)?.label || docType,
            status: status === 'compliant' ? 'approved' : 'missing'
          });
        } else {
          // Scheduled
          const lastUnderscore = key.lastIndexOf('_');
          const docType = key.substring(0, lastUnderscore);
          const period = key.substring(lastUnderscore + 1);
          scheduled.push({
            docType,
            label: SCHEDULED_TYPES.find(t => t.id === docType)?.label || docType,
            period,
            status: status === 'compliant' ? 'approved' : 'missing'
          });
        }
      });
    }

    return {
      rate,
      isLive: true,
      scheduled,
      asap,
      perennial: {
        resolutions: 0, // Not tracked in public analytics
        accomplishments: 0
      }
    };
  }, [selectedBarangay, analytics]);

  // Color helper for badges
  const getBadgeColor = (rate: number) => {
    if (rate === 100) return 'rate-badge-success';
    if (rate >= 80) return 'rate-badge-info';
    if (rate >= 60) return 'rate-badge-warning';
    return 'rate-badge-danger';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge bg="success" pill>Approved</Badge>;
      case 'pending':
        return <Badge bg="warning" pill>Pending Review</Badge>;
      case 'missing':
        return <Badge bg="danger" pill>Missing / Overdue</Badge>;
      case 'not_due':
      default:
        return <Badge bg="secondary" pill>Not Due</Badge>;
    }
  };

  return (
    <section id="leaderboard" className="home-leaderboard-section bg-grid-dark position-relative overflow-hidden">
      {/* 1. Subtle Masked Texture Overlay */}
      <div className="section-masked-texture" />

      {/* 2. Fluid Organic Morphing Blobs */}
      <div className="organic-blob organic-blob-blue" style={{ width: '500px', height: '500px', top: '-10%', left: '-5%', opacity: 0.45 }} />
      <div className="organic-blob organic-blob-amber" style={{ width: '420px', height: '420px', bottom: '-10%', right: '-5%', opacity: 0.4 }} />
      <div className="organic-blob organic-blob-cyan" style={{ width: '350px', height: '350px', top: '35%', right: '25%', opacity: 0.25 }} />

      {/* 3. Floating Decorative Spline Lines */}
      <svg className="floating-deco-lines" viewBox="0 0 1440 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="line-grad-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#006EB7" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#00B4D8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7CB342" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="line-grad-amber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FBA100" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#FFC133" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#006EB7" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path d="M-100,180 C300,40 600,420 1000,140 C1200,40 1400,240 1600,160" className="line-glow-blue" />
        <path d="M-50,420 C350,520 700,80 1100,380 C1300,480 1500,280 1650,320" className="line-glow-amber" />
      </svg>

      {/* 4. Floating Abstract Geometric Elements */}
      <div className="floating-geo-shape geo-diamond geo-diamond-amber" style={{ top: '10%', left: '4%' }} />
      <div className="floating-geo-shape-alt geo-concentric-ring geo-concentric-blue" style={{ top: '16%', right: '7%', width: '90px', height: '90px' }} />
      <div className="floating-geo-drift geo-cross geo-cross-blue" style={{ top: '22%', right: '14%' }} />
      <div className="floating-geo-twinkle geo-sparkle geo-sparkle-amber" style={{ top: '14%', left: '35%' }} />
      <div className="floating-geo-shape geo-hexagon geo-hexagon-amber" style={{ bottom: '12%', left: '5%' }} />
      <div className="floating-geo-shape-alt geo-concentric-ring geo-concentric-amber" style={{ bottom: '10%', right: '4%', width: '70px', height: '70px' }} />
      <div className="floating-geo-drift geo-square-wire geo-square-wire-blue" style={{ bottom: '18%', right: '18%' }} />

      <Container className="position-relative" style={{ zIndex: 2 }}>
        {/* Section Header */}
        <div className="text-center mb-4 sr-heading">
          <div className="home-section-overline" style={{ justifyContent: 'center', color: '#FBA100' }}>
            Civic Transparency
          </div>
          <h2 className="home-section-title home-section-title-white mb-3">Barangay Compliance Leaderboard</h2>
          <p className="home-section-subtitle home-section-subtitle-muted">
            Search and examine the active compliance rankings and submission checklists of individual Barangay SK branches.
          </p>
        </div>

        {/* Directory Filters */}
        <Row className="mb-4 align-items-center justify-content-between g-3 sr-item">
          <Col md={6} lg={5}>
            <div className="d-flex flex-column gap-2">
              <div className="home-search-pill">
                <span className="material-symbols-outlined text-secondary me-2 flex-shrink-0" style={{ fontSize: '20px' }}>
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search barangay name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="home-search-pill-input"
                />
                {searchTerm && (
                  <button 
                    type="button"
                    onClick={() => setSearchTerm('')} 
                    className="btn btn-link p-0 text-secondary d-flex align-items-center justify-content-center ms-2 text-decoration-none"
                    style={{ border: 'none', background: 'transparent' }}
                  >
                    <span className="material-symbols-outlined fs-5">close</span>
                  </button>
                )}
              </div>
              {userBarangay && (
                <div className="ps-2">
                  <span className="text-white-50 small">Quick link: </span>
                  <Button 
                    variant="link" 
                    className="p-0 text-warning small fw-semibold text-decoration-none d-inline-flex align-items-center gap-1 align-baseline"
                    onClick={() => setSearchTerm(userBarangay)}
                  >
                    <span className="material-symbols-outlined fs-6">near_me</span>
                    View {userBarangay}
                  </Button>
                </div>
              )}
            </div>
          </Col>
          <Col md={5} lg={4} className="d-flex justify-content-md-end align-items-center">
            {searchTerm.trim() !== '' ? (
              <div className="text-white-50 small fw-semibold d-flex align-items-center gap-1">
                <span className="material-symbols-outlined fs-5">search</span>
                <span>Search Results ({filteredDataset.length} found)</span>
              </div>
            ) : (
              <div className="segmented-control shadow-sm">
                <button
                  type="button"
                  onClick={() => setFilterType('top')}
                  className={`btn-segmented ${filterType === 'top' ? 'active-top' : ''}`}
                >
                  <span className="material-symbols-outlined fs-5">trending_up</span>
                  <span>Top 5 Compliant</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('bottom')}
                  className={`btn-segmented ${filterType === 'bottom' ? 'active-bottom' : ''}`}
                >
                  <span className="material-symbols-outlined fs-5">trending_down</span>
                  <span>Least Compliant</span>
                </button>
              </div>
            )}
          </Col>
        </Row>

        {/* Leaderboard Table View */}
        <div className="table-responsive leaderboard-table-card sr-item">
          <Table hover className="mb-0 align-middle">
            <thead className="leaderboard-table-header">
              <tr>
                <th style={{ width: '80px' }} className="text-center">Rank</th>
                <th>Barangay Name</th>
                <th style={{ width: '180px' }} className="text-center">Compliance Rate</th>
                <th style={{ width: '160px' }} className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (!analytics || !analytics.barangayRanking) ? (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted">
                    <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                    <span>Loading compliance rankings...</span>
                  </td>
                </tr>
              ) : filteredDataset.length > 0 ? (
                filteredDataset.map((item) => {
                  const originalIndex = leaderboardDataset.findIndex(r => r.barangay === item.barangay) + 1;
                  const isUserBrgy = item.barangay === userBarangay;
                  return (
                    <tr 
                      key={item.barangay} 
                      className="leaderboard-table-row"
                      style={isUserBrgy ? { backgroundColor: 'rgba(0, 110, 183, 0.08)', borderLeft: '4px solid var(--primary, #006EB7)' } : undefined}
                    >
                      <td className="text-center fw-bold text-secondary">
                        {originalIndex === 1 ? (
                          <span className="badge rank-badge-gold rounded-circle p-2" style={{ width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                        ) : originalIndex === 2 ? (
                          <span className="badge rank-badge-silver rounded-circle p-2" style={{ width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                        ) : originalIndex === 3 ? (
                          <span className="badge rank-badge-bronze rounded-circle p-2" style={{ width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                        ) : (
                          <span className="badge rank-badge-standard rounded-circle p-2" style={{ width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            {originalIndex}
                          </span>
                        )}
                      </td>
                      <td className="fw-bold text-dark">
                        <div className="d-flex align-items-center gap-2">
                          <span>{item.barangay}</span>
                          {isUserBrgy && (
                            <Badge bg="primary" className="text-uppercase" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                              Your Barangay
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-center">
                        <Badge className={`${getBadgeColor(item.rate)} px-3 py-1.5 text-uppercase fw-bold`} style={{ fontSize: '11.5px', letterSpacing: '0.03em' }}>
                          {item.rate}%
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          className="rounded-pill px-3 py-1 d-inline-flex align-items-center gap-1.5"
                          onClick={() => handleOpenDetail(item.barangay)}
                        >
                          <span className="material-symbols-outlined fs-6">find_in_page</span>
                          <span>Verify Stats</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted">
                    <span className="material-symbols-outlined fs-1 text-secondary mb-2">search_off</span>
                    <div>
                      {searchTerm.trim() !== '' 
                        ? `No barangays match "${searchTerm}"` 
                        : 'No compliance records available'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* Barangay Compliance Detail Modal Popup */}
        <Modal 
          show={showModal} 
          onHide={() => setShowModal(false)} 
          centered
          size="lg"
          contentClassName="border-0 shadow-lg rounded-3"
        >
          <Modal.Header closeButton className="border-bottom px-4 py-3">
            <Modal.Title className="d-flex align-items-center gap-2 text-dark font-headline" style={{ fontSize: '18px' }}>
              <span className="material-symbols-outlined text-primary fs-3">verified_user</span>
              <span>{selectedBarangay} — Compliance Ledger</span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4 bg-light">
            {detailsData && (
              <Row className="g-4">
                {/* Left Side: Summary Card */}
                <Col lg={4}>
                  <div className="p-4 bg-white rounded-3 border h-100 text-center d-flex flex-column justify-content-between shadow-sm">
                    <div>
                      <h6 className="text-muted text-uppercase tracking-wider fw-bold mb-3" style={{ fontSize: '11px' }}>Scorecard</h6>
                      <div className="position-relative d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '100px', height: '100px' }}>
                        <svg className="w-100 h-100" viewBox="0 0 36 36">
                          <path className="text-light" strokeWidth="3" stroke="#F1F5F9" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path className="text-primary" strokeWidth="3" strokeDasharray={`${detailsData.rate}, 100`} strokeLinecap="round" stroke="#006EB7" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div className="position-absolute fw-bold text-dark fs-4 font-headline">{detailsData.rate}%</div>
                      </div>
                      <div className="text-muted small mb-3">Overall performance score for this year.</div>
                    </div>

                    <div className="border-top pt-3 text-start">
                      <div className="d-flex justify-content-between small text-secondary mb-2">
                        <span>Resolutions Passed:</span>
                        <span className="fw-bold text-dark">{detailsData.perennial.resolutions} docs</span>
                      </div>
                      <div className="d-flex justify-content-between small text-secondary">
                        <span>Accomplishments:</span>
                        <span className="fw-bold text-dark">{detailsData.perennial.accomplishments} reports</span>
                      </div>
                    </div>
                  </div>
                </Col>

                {/* Right Side: Document Checklist */}
                <Col lg={8}>
                  <div className="p-4 bg-white rounded-3 border shadow-sm h-100">
                    <h6 className="text-dark fw-bold mb-3 border-bottom pb-2 font-headline" style={{ fontSize: '14px' }}>Required Submissions Timeline</h6>

                    {/* Scheduled list */}
                    <div className="mb-4">
                      <div className="fw-bold text-secondary small mb-2 text-uppercase tracking-wider" style={{ fontSize: '10px' }}>Scheduled Publications</div>
                      <div className="d-flex flex-column gap-2" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {detailsData.scheduled.map((doc, idx) => (
                          <div key={idx} className="d-flex align-items-center justify-content-between p-2 rounded bg-light border-start border-primary border-3" style={{ fontSize: '13px' }}>
                            <div className="text-dark fw-semibold text-truncate me-2" style={{ maxWidth: '280px' }}>
                              {doc.label} <span className="text-muted small">({doc.period})</span>
                            </div>
                            {getStatusBadge(doc.status)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ASAP checklist */}
                    <div>
                      <div className="fw-bold text-secondary small mb-2 text-uppercase tracking-wider" style={{ fontSize: '10px' }}>One-Time Submissions (ASAP)</div>
                      <div className="d-flex flex-column gap-2">
                        {detailsData.asap.map((doc, idx) => (
                          <div key={idx} className="d-flex align-items-center justify-content-between p-2 rounded bg-light border-start border-info border-3" style={{ fontSize: '13px' }}>
                            <div className="text-dark fw-semibold text-truncate me-2">
                              {doc.label}
                            </div>
                            {getStatusBadge(doc.status)}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </Col>
              </Row>
            )}
          </Modal.Body>

          <Modal.Footer className="border-top px-4 py-3 bg-white">
            {!detailsData?.isLive && (
              <span className="text-muted small me-auto d-flex align-items-center gap-1">
                <span className="material-symbols-outlined fs-5">lock</span>
                <span>Public Sandbox Data</span>
              </span>
            )}
            <Button variant="secondary" onClick={() => setShowModal(false)} className="rounded-pill px-4">
              Close Ledger
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </section>
  );
};

export default HomeLeaderboard;
