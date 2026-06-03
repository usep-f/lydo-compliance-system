import React, { useEffect, useRef } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import type { User } from 'firebase/auth';

interface HomeHeroProps {
  onLoginClick: () => void;
  user: User | null;
  handleDashboardRedirect: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ onLoginClick, user, handleDashboardRedirect }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse-parallax tilt on card
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const rotateX = ((e.clientY - centerY) / rect.height) * -10;
      const rotateY = ((e.clientX - centerX) / rect.width) * 12;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = 'perspective(1000px) rotateY(-8deg) rotateX(3deg) translateY(0px)';
    };

    window.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <section className="home-hero-section">
      {/* Animated mesh blobs */}
      <div className="hero-blob-wrap">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-blob hero-blob-3" />
        <div className="hero-blob hero-blob-4" />
      </div>

      {/* Noise texture */}
      <div className="hero-noise" />
      {/* Dot grid */}
      <div className="hero-grid" />

      <Container className="hero-content">
        <Row className="align-items-center gy-5" style={{ paddingTop: '100px', paddingBottom: '80px' }}>
          {/* Left: Text */}
          <Col lg={7} className="text-center text-lg-start">
            {/* Tag badge */}
            <div className="hero-tag-badge">
              <span className="hero-tag-dot" />
              <span>Official LYDO Portal · Republic of the Philippines</span>
            </div>

            {/* Headline */}
            <h1 className="hero-headline">
              Empowering Youth.
              <br />
              <span className="hero-headline-accent">Ensuring Accountability.</span>
            </h1>

            {/* Sub-description */}
            <p className="hero-subtext">
              The official compliance system of the Local Youth Development Office. Streamlining Sangguniang Kabataan governance with modern digital tools for transparency, accountability, and youth empowerment.
            </p>

            {/* CTAs */}
            <div className="d-flex flex-column flex-sm-row justify-content-center justify-content-lg-start align-items-center gap-3">
              {user ? (
                <Button
                  className="hero-cta-primary d-flex align-items-center gap-2"
                  onClick={handleDashboardRedirect}
                  id="hero-cta-dashboard"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</span>
                  Go to Dashboard
                </Button>
              ) : (
                <Button
                  className="hero-cta-primary d-flex align-items-center gap-2"
                  onClick={onLoginClick}
                  id="hero-cta-login"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>login</span>
                  Access Portal · Apply
                </Button>
              )}

              <Button
                className="hero-cta-secondary d-flex align-items-center gap-2"
                id="hero-cta-learnmore"
                onClick={() => {
                  const el = document.getElementById('stats');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>expand_more</span>
                Learn More
              </Button>
            </div>

            {/* Stat chips */}
            <div className="hero-stat-chips">
              <div className="hero-stat-chip">
                <div>
                  <div className="hero-stat-chip-value">33</div>
                  <div className="hero-stat-chip-label">SK Offices</div>
                </div>
              </div>
              <div className="hero-stat-chip">
                <div>
                  <div className="hero-stat-chip-value">88%</div>
                  <div className="hero-stat-chip-label">Compliance Rate</div>
                </div>
              </div>
              <div className="hero-stat-chip">
                <div>
                  <div className="hero-stat-chip-value">3</div>
                  <div className="hero-stat-chip-label">Doc Categories</div>
                </div>
              </div>
            </div>
          </Col>

          {/* Right: Glowing card */}
          <Col lg={5} className="d-flex justify-content-center justify-content-lg-end">
            <div className="hero-card-wrap" style={{ width: '100%', maxWidth: '420px' }}>
              {/* Animated gradient border glow */}
              <div className="hero-card-glow" />

              {/* Card body */}
              <div className="hero-card-inner" ref={cardRef} style={{ transition: 'transform 0.15s cubic-bezier(0.4,0,0.2,1)' }}>
                {/* Header */}
                <div className="d-flex align-items-center justify-content-between mb-4 pb-3" style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <div className="d-flex align-items-center gap-2">
                    <div
                      style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #006EB7, #0087E0)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <span className="material-symbols-outlined text-white" style={{ fontSize: '18px' }}>monitoring</span>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>Compliance Report</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>City Performance · Live</div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.05em', padding: '4px 10px', borderRadius: '9999px',
                      background: 'linear-gradient(135deg, rgba(124,179,66,0.15), rgba(124,179,66,0.05))',
                      color: '#558B2F', border: '1px solid rgba(124,179,66,0.3)'
                    }}
                  >
                    ● Active
                  </span>
                </div>

                {/* Progress Ring */}
                <div className="d-flex flex-column align-items-center text-center py-2 mb-3">
                  <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: '140px', height: '140px' }}>
                    <svg className="w-100 h-100" viewBox="0 0 36 36">
                      <path
                        strokeWidth="3"
                        stroke="#F1F5F9"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        strokeWidth="3"
                        strokeDasharray="88, 100"
                        strokeLinecap="round"
                        stroke="url(#progressGrad)"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <defs>
                        <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#006EB7" />
                          <stop offset="100%" stopColor="#0087E0" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="position-absolute d-flex flex-column align-items-center">
                      <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '2rem', color: '#0F172A', lineHeight: 1 }}>88%</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8' }}>City Average</span>
                    </div>
                  </div>
                </div>

                {/* Mini stat row */}
                <div className="row g-2">
                  <div className="col-4">
                    <div
                      style={{
                        padding: '10px 8px', borderRadius: '12px', textAlign: 'center',
                        background: 'rgba(124,179,66,0.07)', border: '1px solid rgba(124,179,66,0.15)'
                      }}
                    >
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B', marginBottom: '4px', letterSpacing: '0.04em' }}>Compliant</div>
                      <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '16px', color: '#558B2F' }}>29/33</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div
                      style={{
                        padding: '10px 8px', borderRadius: '12px', textAlign: 'center',
                        background: 'rgba(251,161,0,0.07)', border: '1px solid rgba(251,161,0,0.15)'
                      }}
                    >
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B', marginBottom: '4px', letterSpacing: '0.04em' }}>Review</div>
                      <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '16px', color: '#B45309' }}>14</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div
                      style={{
                        padding: '10px 8px', borderRadius: '12px', textAlign: 'center',
                        background: 'rgba(0,110,183,0.07)', border: '1px solid rgba(0,110,183,0.15)'
                      }}
                    >
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B', marginBottom: '4px', letterSpacing: '0.04em' }}>Offices</div>
                      <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '16px', color: '#006EB7' }}>33</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default HomeHero;
