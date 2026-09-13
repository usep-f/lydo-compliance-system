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
    <section className="home-hero-section kinetic-section position-relative overflow-hidden">
      {/* 1. Subtle Masked Texture Overlay */}
      <div className="section-masked-texture-hero" />

      {/* 2. Fluid Organic Morphing Blobs */}
      <div className="organic-blob organic-blob-blue" style={{ width: '550px', height: '550px', top: '-15%', left: '-10%', opacity: 0.45 }} />
      <div className="organic-blob organic-blob-gold" style={{ width: '480px', height: '480px', bottom: '-15%', right: '-8%', opacity: 0.38 }} />
      <div className="organic-blob organic-blob-cyan" style={{ width: '380px', height: '380px', top: '35%', left: '30%', opacity: 0.25 }} />

      {/* 3. Floating Decorative Spline Lines */}
      <svg className="floating-deco-lines" viewBox="0 0 1440 700" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hero-grad-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#006EB7" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#00B4D8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#7CB342" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="hero-grad-amber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FBA100" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#FFC133" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#006EB7" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path d="M-100,280 C350,120 700,520 1100,200 C1300,80 1500,340 1650,250" className="line-glow-blue" style={{ stroke: 'url(#hero-grad-blue)' }} />
        <path d="M-80,480 C400,600 750,180 1150,450 C1350,560 1550,300 1700,380" className="line-glow-amber" style={{ stroke: 'url(#hero-grad-amber)' }} />
      </svg>

      {/* 4. Floating Geometric Elements (Responsive hidden on small screens to prevent layout overflow) */}
      <div className="floating-geo-shape geo-concentric-ring geo-concentric-amber d-none d-lg-block" style={{ top: '12%', right: '12%', width: '80px', height: '80px' }} />
      <div className="floating-geo-shape-alt geo-diamond geo-diamond-blue d-none d-md-block" style={{ bottom: '20%', left: '5%' }} />
      <div className="floating-geo-drift geo-cross geo-cross-amber d-none d-md-block" style={{ top: '25%', left: '8%' }} />
      <div className="floating-geo-drift geo-square-wire geo-square-wire-blue d-none d-lg-block" style={{ bottom: '15%', right: '18%' }} />
      <div className="floating-geo-twinkle geo-sparkle geo-sparkle-amber d-none d-sm-block" style={{ top: '18%', left: '42%' }} />
      <div className="floating-geo-twinkle geo-sparkle geo-sparkle-cyan d-none d-sm-block" style={{ bottom: '28%', right: '35%' }} />
      <div className="floating-geo-shape-alt geo-dots-cluster text-info d-none d-xl-block" style={{ top: '65%', left: '3%' }}>
        {[...Array(16)].map((_, i) => (
          <div key={i} className="geo-dot" />
        ))}
      </div>

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

      <Container className="hero-content position-relative" style={{ zIndex: 4 }}>
        <Row className="align-items-center gy-4 gy-lg-0">
          {/* Left: Text Column */}
          <Col lg={6} xl={6} className="d-flex flex-column align-items-center align-items-lg-start text-center text-lg-start order-2 order-lg-1">
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
            <div className="d-flex flex-column flex-sm-row justify-content-center justify-content-lg-start align-items-center gap-3 hero-animate hero-anim-3 w-100 w-lg-auto">
              {user ? (
                <Button
                  className="hero-cta-primary d-flex align-items-center justify-content-center gap-2"
                  onClick={handleDashboardRedirect}
                  id="hero-cta-dashboard"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</span>
                  Go to Dashboard
                </Button>
              ) : (
                <Button
                  className="hero-cta-primary d-flex align-items-center justify-content-center gap-2"
                  onClick={onLoginClick}
                  id="hero-cta-login"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>login</span>
                  Access Portal · Apply
                </Button>
              )}

              <Button
                className="hero-cta-secondary d-flex align-items-center justify-content-center gap-2"
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

          {/* Right: Glowing LYDO Logo Column */}
          <Col lg={6} xl={6} className="d-flex justify-content-center align-items-center order-1 order-lg-2">
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
