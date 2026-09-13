import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

export const HomeTimeline: React.FC = () => {
  const steps = [
    {
      step: '1',
      title: 'Submit Application',
      icon: 'app_registration',
      desc: 'Fill out the registration form in the Portal Modal. You must provide your name, select your barangay, and upload an SK Validation Document (e.g., Oath of Office, DILG certification, or valid ID).'
    },
    {
      step: '2',
      title: 'Validation & Verification',
      icon: 'admin_panel_settings',
      desc: 'LYDO administrators review your validation document inside the Admin Dashboard. Upon confirmation of your SK official status, your account is approved, and an invitation email is dispatched.'
    },
    {
      step: '3',
      title: 'Password Configuration',
      icon: 'lock_open',
      desc: 'Click the password setup link in your approval email. Define a secure password to activate your account, enabling full login access to upload and monitor your compliance documents.'
    }
  ];

  return (
    <section className="home-timeline-section bg-blueprint-dark position-relative overflow-hidden">
      {/* 1. Subtle Masked Texture Overlay */}
      <div className="section-masked-texture" />

      {/* 2. Fluid Organic Morphing Blobs */}
      <div className="organic-blob organic-blob-amber" style={{ width: '450px', height: '450px', top: '-5%', right: '-8%', opacity: 0.42 }} />
      <div className="organic-blob organic-blob-blue" style={{ width: '500px', height: '500px', bottom: '-8%', left: '-8%', opacity: 0.45 }} />
      <div className="organic-blob organic-blob-cyan" style={{ width: '320px', height: '320px', top: '45%', right: '30%', opacity: 0.25 }} />

      {/* 3. Floating Decorative Spline Lines */}
      <svg className="floating-deco-lines" viewBox="0 0 1440 700" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M-100,120 C400,300 700,50 1100,450 C1300,550 1500,200 1600,280" className="line-glow-amber" />
        <path d="M-80,500 C300,650 600,200 950,550 C1200,400 1450,600 1650,450" className="line-glow-blue" />
      </svg>

      {/* 4. Floating Abstract Geometric Elements */}
      <div className="floating-geo-shape geo-diamond geo-diamond-amber" style={{ top: '15%', right: '7%' }} />
      <div className="floating-geo-shape-alt geo-concentric-ring geo-concentric-blue" style={{ bottom: '18%', left: '5%', width: '90px', height: '90px' }} />
      <div className="floating-geo-drift geo-cross geo-cross-blue" style={{ top: '22%', left: '8%' }} />
      <div className="floating-geo-twinkle geo-sparkle geo-sparkle-amber" style={{ top: '28%', right: '35%' }} />
      <div className="floating-geo-shape geo-square-wire geo-square-wire-blue" style={{ bottom: '22%', right: '9%' }} />
      <div className="floating-geo-shape-alt geo-concentric-ring geo-concentric-amber" style={{ top: '20%', left: '8%', width: '60px', height: '60px' }} />

      <Container className="position-relative" style={{ zIndex: 2 }}>
        {/* Section Header */}
        <div className="text-center mb-4 sr-heading">
          <div className="home-section-overline" style={{ justifyContent: 'center', color: '#5CB8FF' }}>
            Portal Onboarding
          </div>
          <h2 className="home-section-title home-section-title-white mb-3">SK Official Registration Journey</h2>
          <p className="home-section-subtitle home-section-subtitle-muted">
            A guide to setting up your account. Read below to understand how validation documents are reviewed and approved.
          </p>
        </div>

        {/* Timeline Layout */}
        <Row className="justify-content-center">
          <Col lg={9}>
            <div className="home-timeline">
              <div className="home-timeline-line" />
              {steps.map((step, idx) => (
                <div key={idx} className="home-timeline-step d-flex align-items-start gap-3 gap-md-4 mb-4 pb-2 position-relative sr-item">
                  {/* Step Badge */}
                  <div className="home-timeline-badge flex-shrink-0 mt-1">
                    {step.step}
                  </div>

                  {/* Step Content */}
                  <div className="p-4 home-timeline-card w-100">
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-3">
                        <div className="timeline-icon-box">
                          <span className="material-symbols-outlined fs-5">{step.icon}</span>
                        </div>
                        <h5 className="fw-bold text-dark mb-0 font-headline" style={{ fontSize: '16px' }}>
                          {step.title}
                        </h5>
                      </div>
                      <span className="timeline-step-tag">
                        Stage 0{step.step}
                      </span>
                    </div>
                    <p className="text-secondary small mb-0" style={{ lineHeight: 1.7, fontSize: '13.5px' }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default HomeTimeline;
