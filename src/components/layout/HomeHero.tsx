import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import type { User } from 'firebase/auth';
import lydoLogo from '../../assets/lydo-logo.webp';

interface HomeHeroProps {
  onLoginClick: () => void;
  user: User | null;
  handleDashboardRedirect: () => void;
  activeBarangaysCount: number;
  activeUsersCount: number;
  totalSubmissions: number;
}

function useCountUp(target: number, duration = 1000): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let frameId: number;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);
  return value;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ 
  onLoginClick, 
  user, 
  handleDashboardRedirect,
  activeBarangaysCount,
  activeUsersCount,
  totalSubmissions
}) => {
  const animatedBarangays = useCountUp(activeBarangaysCount);
  const animatedUsers = useCountUp(activeUsersCount);
  const animatedSubmissions = useCountUp(totalSubmissions, 1200);

  return (
    <section className="home-hero-section kinetic-section">
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
          <Col lg={7} className="text-center text-lg-start order-2 order-lg-1">
            {/* Headline */}
            <h1 className="hero-headline hero-animate hero-anim-1">
              Empowering Youth.
              <br />
              <span className="hero-headline-accent">Ensuring Accountability.</span>
            </h1>

            {/* Sub-description */}
            <p className="hero-subtext hero-animate hero-anim-2">
              The official compliance system of the Local Youth Development Office. Streamlining Sangguniang Kabataan governance with modern digital tools for transparency, accountability, and youth empowerment.
            </p>

            {/* CTAs */}
            <div className="d-flex flex-column flex-sm-row justify-content-center justify-content-lg-start align-items-center gap-3 hero-animate hero-anim-3">
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
              <div className="hero-stat-chip hero-animate hero-anim-4">
                <div>
                  <div className="hero-stat-chip-value">{animatedBarangays}</div>
                  <div className="hero-stat-chip-label">Active Branches</div>
                </div>
              </div>
              <div className="hero-stat-chip hero-animate hero-anim-5">
                <div>
                  <div className="hero-stat-chip-value">{animatedUsers}</div>
                  <div className="hero-stat-chip-label">Authorized Users</div>
                </div>
              </div>
              <div className="hero-stat-chip hero-animate hero-anim-6">
                <div>
                  <div className="hero-stat-chip-value">{animatedSubmissions}</div>
                  <div className="hero-stat-chip-label">Submissions</div>
                </div>
              </div>
            </div>
          </Col>

          {/* Right: Glowing LYDO Logo */}
          <Col lg={5} className="d-flex justify-content-center justify-content-lg-end align-items-center order-1 order-lg-2">
            <div className="hero-logo-container">
              <div className="hero-logo-glow" />
              <div className="hero-logo-circle">
                <img
                  src={lydoLogo}
                  alt="LYDO Logo"
                  className="hero-logo-img"
                />
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default HomeHero;
