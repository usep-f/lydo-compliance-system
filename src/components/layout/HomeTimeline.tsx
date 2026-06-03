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
    <section className="py-5 bg-light border-bottom position-relative">
      <Container className="py-4">
        {/* Section Header */}
        <div className="text-center mb-5 sr-heading">
          <div className="text-primary fw-bold text-uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-headline)', fontSize: '12px' }}>
            Portal Onboarding
          </div>
          <h2 className="home-section-title mb-3">SK Official Registration Journey</h2>
          <p className="home-section-subtitle">
            A guide to setting up your account. Read below to understand how validation documents are reviewed and approved.
          </p>
        </div>

        {/* Timeline Layout */}
        <Row className="justify-content-center">
          <Col lg={9}>
            <div className="home-timeline">
              {steps.map((step, idx) => (
                <div key={idx} className="d-flex gap-4 mb-4 pb-2 position-relative sr-item">
                  {/* Step Badge */}
                  <div className="home-timeline-badge flex-shrink-0">
                    {step.step}
                  </div>

                  {/* Step Content */}
                  <div className="p-4 bg-white rounded-3 border shadow-sm w-100 glow-hover-card">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-primary fs-4">{step.icon}</span>
                      <h5 className="fw-bold text-dark mb-0 font-headline" style={{ fontSize: '15px' }}>
                        {step.title}
                      </h5>
                    </div>
                    <p className="text-secondary small mb-0" style={{ lineHeight: 1.6 }}>
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
