import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Table, Form, InputGroup, Button, Tabs, Tab, Modal, Badge } from 'react-bootstrap';
import type { ComplianceData } from '../../hooks/useComplianceData';
import { BARANGAYS } from '../../constants/barangays';
import { SCHEDULED_TYPES } from '../../constants/submissionTypes';

interface HomeLeaderboardProps {
  liveData: ComplianceData | null;
}

export const HomeLeaderboard: React.FC<HomeLeaderboardProps> = ({ liveData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'directory'>('leaderboard');
  const [selectedBarangay, setSelectedBarangay] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Deterministic mock compliance rate for guests based on Barangay name hash
  const getMockData = useMemo(() => {
    return BARANGAYS.map(b => {
      let hash = 0;
      for (let i = 0; i < b.length; i++) {
        hash = b.charCodeAt(i) + ((hash << 5) - hash);
      }
      // Possible rates: 100, 95, 90, 85, 80, 75, 60
      const rates = [100, 95, 90, 85, 80, 75, 60];
      const idx = Math.abs(hash) % rates.length;
      const rate = rates[idx];
      const approvedCount = Math.round((rate / 100) * 15); // assume 15 expected docs
      return {
        barangay: b,
        rate,
        approved: approvedCount,
        expected: 15,
      };
    }).sort((a, b) => b.rate - a.rate);
  }, []);

  // Compute leaderboard dataset
  const leaderboardDataset = useMemo(() => {
    if (liveData && liveData.barangayRanking) {
      return liveData.barangayRanking;
    }
    return getMockData;
  }, [liveData, getMockData]);

  // Filtered leaderboard list based on search query
  const filteredDataset = useMemo(() => {
    return leaderboardDataset.filter(item => 
      item.barangay.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leaderboardDataset, searchTerm]);

  // Open checklist detail modal for a Barangay
  const handleOpenDetail = (barangay: string) => {
    setSelectedBarangay(barangay);
    setShowModal(true);
  };

  // Get active selected barangay data details
  const detailsData = useMemo(() => {
    if (!selectedBarangay) return null;

    const rankInfo = leaderboardDataset.find(r => r.barangay === selectedBarangay);
    const rate = rankInfo ? rankInfo.rate : 80;

    // 1. Live Data mapping
    if (liveData) {
      const scheduledRows = liveData.matrixData.filter(cell => cell.barangay === selectedBarangay);
      const asapRows = liveData.asapStatus.filter(cell => cell.barangay === selectedBarangay);
      const perennialRow = liveData.barangayPerennialSummary.find(cell => cell.barangay === selectedBarangay);

      return {
        rate,
        isLive: true,
        scheduled: scheduledRows.map(row => ({
          docType: row.docType,
          label: SCHEDULED_TYPES.find(t => t.id === row.docType)?.label || row.docType,
          period: row.period,
          status: row.status
        })),
        asap: asapRows.map(row => ({
          docType: row.docType,
          label: row.label,
          status: row.status
        })),
        perennial: {
          resolutions: perennialRow ? perennialRow.resolutions : 0,
          accomplishments: perennialRow ? perennialRow.accomplishmentsTotal : 0
        }
      };
    }

    // 2. Guest mock checklist mapping (determinstic checkmarks based on compliance rate)
    // Scheduled docs mock: AYDP (Q1-Q4), Sessions (Jan-Jun)
    const mockScheduled = [
      { docType: 'full_disclosure', label: 'Full Disclosure Policy Board', period: '2026-Q1', status: rate >= 75 ? 'approved' : 'missing' },
      { docType: 'full_disclosure', label: 'Full Disclosure Policy Board', period: '2026-Q2', status: rate >= 90 ? 'approved' : 'pending' },
      { docType: 'regular_session_minutes', label: 'Regular Session Minutes', period: 'Jan 2026', status: 'approved' },
      { docType: 'regular_session_minutes', label: 'Regular Session Minutes', period: 'Feb 2026', status: rate >= 60 ? 'approved' : 'missing' },
      { docType: 'regular_session_minutes', label: 'Regular Session Minutes', period: 'Mar 2026', status: rate >= 80 ? 'approved' : 'pending' },
      { docType: 'kk_minutes', label: 'KK Minutes of Meeting', period: '2026-S1', status: rate === 100 ? 'approved' : 'missing' }
    ];

    const mockAsap = [
      { docType: 'directory_sk_officials', label: 'Directory of SK Officials', status: 'approved' },
      { docType: 'kk_profiling', label: 'KK Profiling Registry', status: rate >= 80 ? 'approved' : 'pending' },
      { docType: 'list_youth_orgs', label: 'List of Youth Organizations', status: rate >= 75 ? 'approved' : 'missing' }
    ];

    const mockPerennial = {
      resolutions: Math.round(rate / 10),
      accomplishments: Math.round(rate / 15)
    };

    return {
      rate,
      isLive: false,
      scheduled: mockScheduled,
      asap: mockAsap,
      perennial: mockPerennial
    };
  }, [selectedBarangay, leaderboardDataset, liveData]);

  // Color helper for badges
  const getBadgeColor = (rate: number) => {
    if (rate === 100) return 'bg-success';
    if (rate >= 80) return 'bg-info';
    if (rate >= 60) return 'bg-warning';
    return 'bg-danger';
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
    <section id="leaderboard" className="py-5 bg-light border-bottom">
      <Container className="py-4">
        {/* Section Header */}
        <div className="text-center mb-5">
          <div className="text-primary fw-bold text-uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-headline)', fontSize: '12px' }}>
            CIVIC TRANSPARENCY
          </div>
          <h2 className="home-section-title mb-3">Barangay Compliance Directory</h2>
          <p className="home-section-subtitle">
            Search, sort, and examine the active compliance rankings and submission checklists of individual Barangay SK branches.
          </p>
        </div>

        {/* Directory Filters */}
        <Row className="mb-4 align-items-center justify-content-between g-3">
          <Col md={6} lg={5}>
            <InputGroup className="shadow-sm rounded-pill" style={{ overflow: 'hidden' }}>
              <InputGroup.Text className="bg-white border-end-0 px-3">
                <span className="material-symbols-outlined text-secondary">search</span>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search barangay name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="border-start-0 ps-1"
                style={{ borderTopRightRadius: '9999px', borderBottomRightRadius: '9999px', height: '42px' }}
              />
            </InputGroup>
          </Col>
          <Col md={5} lg={4} className="d-flex justify-content-md-end">
            <Tabs 
              activeKey={activeTab} 
              onSelect={(k) => setActiveTab(k as 'leaderboard' | 'directory')}
              id="directory-tab-toggle"
              className="border-0 shadow-sm p-1 bg-white rounded-pill"
            >
              <Tab 
                eventKey="leaderboard" 
                title={
                  <div className="d-flex align-items-center gap-1.5 px-3 py-1 fw-bold fs-7">
                    <span className="material-symbols-outlined fs-5">format_list_bulleted</span>
                    <span>Leaderboard</span>
                  </div>
                } 
              />
              <Tab 
                eventKey="directory" 
                title={
                  <div className="d-flex align-items-center gap-1.5 px-3 py-1 fw-bold fs-7">
                    <span className="material-symbols-outlined fs-5">grid_view</span>
                    <span>Directory Grid</span>
                  </div>
                } 
              />
            </Tabs>
          </Col>
        </Row>

        {/* Tab Content rendering */}
        {activeTab === 'leaderboard' ? (
          /* Leaderboard Table View */
          <div className="table-responsive shadow-sm bg-white rounded-3 border">
            <Table hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th style={{ width: '80px' }} className="text-center">Rank</th>
                  <th>Barangay Name</th>
                  <th style={{ width: '180px' }} className="text-center">Compliance Rate</th>
                  <th style={{ width: '160px' }} className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDataset.length > 0 ? (
                  filteredDataset.map((item) => {
                    const originalIndex = leaderboardDataset.findIndex(r => r.barangay === item.barangay) + 1;
                    return (
                      <tr key={item.barangay}>
                        <td className="text-center fw-bold text-secondary">
                          {originalIndex === 1 ? (
                            <span className="badge rounded-circle bg-warning text-dark p-2" style={{ width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                          ) : originalIndex === 2 ? (
                            <span className="badge rounded-circle bg-light text-dark border p-2" style={{ width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                          ) : originalIndex === 3 ? (
                            <span className="badge rounded-circle bg-light text-dark border p-2" style={{ width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                          ) : (
                            originalIndex
                          )}
                        </td>
                        <td className="fw-bold text-dark">{item.barangay}</td>
                        <td className="text-center">
                          <Badge className={`${getBadgeColor(item.rate)} px-3 py-1.5 text-uppercase`} style={{ fontSize: '11.5px', letterSpacing: '0.03em' }}>
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
                      <div>No barangays match "{searchTerm}"</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        ) : (
          /* Card Directory Grid View */
          <Row className="g-3">
            {filteredDataset.length > 0 ? (
              filteredDataset.map((item) => (
                <Col key={item.barangay} xs={12} sm={6} md={4} lg={3}>
                  <div 
                    className="card glow-hover-card p-3 h-100 d-flex flex-column justify-content-between"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleOpenDetail(item.barangay)}
                  >
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <span className="material-symbols-outlined text-primary fs-3">location_city</span>
                        <Badge className={`${getBadgeColor(item.rate)} rounded-pill`}>
                          {item.rate}%
                        </Badge>
                      </div>
                      <h6 className="fw-bold text-dark mb-1 text-truncate" title={item.barangay}>
                        {item.barangay}
                      </h6>
                      <p className="text-muted small mb-0">
                        {item.approved} / {item.expected} documents approved.
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-top d-flex align-items-center justify-content-between text-primary fw-bold small">
                      <span>Review Reports</span>
                      <span className="material-symbols-outlined fs-5">arrow_right_alt</span>
                    </div>
                  </div>
                </Col>
              ))
            ) : (
              <Col xs={12} className="text-center py-5 text-muted border bg-white rounded-3 shadow-sm">
                <span className="material-symbols-outlined fs-1 text-secondary mb-2">search_off</span>
                <div>No barangays match "{searchTerm}"</div>
              </Col>
            )}
          </Row>
        )}

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
