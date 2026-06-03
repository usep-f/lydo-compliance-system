import React from 'react';
import { Container, Row, Col, Badge } from 'react-bootstrap';

export const HomeNews: React.FC = () => {
  const newsItems = [
    {
      date: 'June 01, 2026',
      tag: 'Deadlines',
      tagColor: 'bg-danger-subtle text-danger border-danger-subtle',
      title: 'FY 2026 Q2 Full Disclosure Submissions Calendar',
      desc: 'Reminder to all SK Treasurers and Chairpersons: The submission period for the Q2 Full Disclosure Board updates closes on July 15, 2026. Please ensure files match standard layouts before uploading.'
    },
    {
      date: 'May 28, 2026',
      tag: 'System Update',
      tagColor: 'bg-primary-subtle text-primary border-primary-subtle',
      title: 'New PDF Screening & Metadata Check Module',
      desc: 'The portal now automatically screens uploaded PDF reports for formatting errors and structural metadata integrity to prevent corrupted submissions. Unsecured files will be rejected immediately.'
    },
    {
      date: 'May 15, 2026',
      tag: 'Guidelines',
      tagColor: 'bg-warning-subtle text-warning border-warning-subtle',
      title: 'Updated KK Profiling Submission Requirements',
      desc: 'Please download the revised excel template for KK Profiling registry compilations. Once populated, convert to PDF and upload via the ASAP category in your dashboard.'
    }
  ];

  return (
    <section id="news" className="py-5 bg-white border-bottom">
      <Container className="py-4">
        {/* Section Header */}
        <div className="text-center mb-5">
          <div className="text-primary fw-bold text-uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-headline)', fontSize: '12px' }}>
            Office Advisories
          </div>
          <h2 className="home-section-title mb-3">Latest Bulletins & Advisories</h2>
          <p className="home-section-subtitle">
            Stay informed with the latest directives, compliance circulars, and system notices released by the Local Youth Development Office.
          </p>
        </div>

        {/* News Grid */}
        <Row className="gy-4">
          {newsItems.map((item, idx) => (
            <Col lg={4} key={idx}>
              <div 
                className="card h-100 p-4 shadow-sm glow-hover-card d-flex flex-column justify-content-between"
                style={{ borderRadius: '16px', backgroundColor: '#FFFFFF' }}
              >
                <div>
                  {/* Meta tag */}
                  <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                    <span className="text-muted small fw-semibold">{item.date}</span>
                    <Badge className={`px-2.5 py-1 text-capitalize ${item.tagColor} border`} style={{ fontSize: '10px' }}>
                      {item.tag}
                    </Badge>
                  </div>
                  {/* Title */}
                  <h5 className="fw-bold text-dark mb-3 font-headline" style={{ fontSize: '14.5px', lineHeight: 1.4 }}>
                    {item.title}
                  </h5>
                  {/* Description */}
                  <p className="text-secondary small mb-0" style={{ lineHeight: 1.6 }}>
                    {item.desc}
                  </p>
                </div>
                
                {/* Learn more link */}
                <div className="mt-4 pt-2 d-inline-flex align-items-center gap-1.5 text-primary fw-bold small" style={{ cursor: 'pointer' }}>
                  <span>Read Full Memo</span>
                  <span className="material-symbols-outlined fs-5">arrow_right_alt</span>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
};

export default HomeNews;
