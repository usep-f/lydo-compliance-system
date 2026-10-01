import React, { useEffect, useRef, useState } from 'react';
import { Container, Badge, Spinner, Row, Col } from 'react-bootstrap';
import { useCMSData } from '../../hooks/useCMSData';
import { BulletinVisualBanner } from '../common/BulletinVisualBanner';

export const HomeNews: React.FC = () => {
  const { bulletins, loading } = useCMSData();
  const sectionRef = useRef<HTMLElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [prevBulletinsLength, setPrevBulletinsLength] = useState(bulletins.length);

  // Synchronize index if bulletins count changes
  if (bulletins.length !== prevBulletinsLength) {
    setPrevBulletinsLength(bulletins.length);
    if (activeIndex >= bulletins.length) {
      setActiveIndex(0);
    }
  }

  // Auto-scroll spotlight every 5 seconds unless hovered
  useEffect(() => {
    if (bulletins.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev >= bulletins.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [bulletins.length, isHovered]);

  // Scroll active card into view within the container ONLY (prevents window horizontal shift)
  useEffect(() => {
    if (!filmstripRef.current) return;
    const container = filmstripRef.current;
    const activeCardEl = container.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null;
    if (activeCardEl) {
      const cardLeft = activeCardEl.offsetLeft;
      const cardWidth = activeCardEl.offsetWidth;
      const containerWidth = container.clientWidth;
      const targetScrollLeft = cardLeft - (containerWidth / 2) + (cardWidth / 2);
      
      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth'
      });
    }
  }, [activeIndex]);

  // Intersection observer for section entrance
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handlePrev = () => {
    if (bulletins.length <= 1) return;
    setActiveIndex((prev) => (prev === 0 ? bulletins.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (bulletins.length <= 1) return;
    setActiveIndex((prev) => (prev >= bulletins.length - 1 ? 0 : prev + 1));
  };

  const activeBulletin = bulletins[activeIndex] || bulletins[0];

  const formatDate = (ts?: any): string => {
    if (!ts) return '';
    try {
      if (ts.toDate) {
        return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      const millis = ts.toMillis?.() || ts;
      return new Date(millis).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <section id="news" className="home-news-section bg-grid-light position-relative overflow-hidden py-5" ref={sectionRef}>
      {/* 1. Subtle Masked Texture Overlay */}
      <div className="section-masked-texture-light" />

      {/* 2. Fluid Organic Morphing Blobs */}
      <div className="organic-blob organic-blob-blue" style={{ width: '500px', height: '500px', top: '-10%', left: '-6%' }} />
      <div className="organic-blob organic-blob-amber" style={{ width: '450px', height: '450px', bottom: '-8%', right: '-6%' }} />
      <div className="organic-blob organic-blob-green" style={{ width: '380px', height: '380px', top: '35%', right: '18%' }} />

      {/* 3. Floating Decorative Spline Lines */}
      <svg className="floating-deco-lines" viewBox="0 0 1440 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="news-grad-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#006EB7" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#00B4D8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7CB342" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path d="M-50,220 C350,80 750,450 1150,150 C1300,50 1450,300 1600,200" className="line-glow-blue" style={{ stroke: 'url(#news-grad-blue)', opacity: 0.35 }} />
      </svg>

      <Container className="position-relative" style={{ zIndex: 2 }}>
        {loading ? (
          <div className="py-5 text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-secondary small">Syncing advisories...</p>
          </div>
        ) : bulletins.length === 0 ? (
          <div className="py-4 text-center">
            <div className="home-section-overline" style={{ justifyContent: 'center' }}>
              Office Advisories
            </div>
            <h2 className="home-section-title mb-3">Latest Bulletins & Advisories</h2>
            <p className="text-secondary small mb-0">No active bulletins or advisories posted at this time.</p>
          </div>
        ) : (
          <>
            {/* Section Header */}
            <div className={`text-center mb-4 pb-2 sr-heading${visible ? ' visible' : ''}`}>
              <div className="home-section-overline" style={{ justifyContent: 'center' }}>
                Office Advisories
              </div>
              <h2 className="home-section-title mb-2">Latest Bulletins & Advisories</h2>
              <p className="home-section-subtitle mx-auto" style={{ maxWidth: '680px' }}>
                Stay informed with the latest directives, compliance circulars, and system notices released by the Lucena City Local Youth Development Office.
              </p>
            </div>

            {/* 🌟 FEATURED HERO SPOTLIGHT STAGE */}
            {activeBulletin && (
              <div
                className={`bulletin-hero-stage mx-auto p-3 p-md-4 mb-5 sr-item${visible ? ' visible' : ''}`}
                style={{ maxWidth: '1080px' }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <Row className="g-4 align-items-stretch">
                  {/* Left Column: Big Center Visual */}
                  <Col xs={12} lg={6} className="d-flex">
                    <div className="w-100 bulletin-crossfade" key={`visual-${activeBulletin.id}`}>
                      <BulletinVisualBanner
                        bulletin={activeBulletin}
                        variant="hero"
                        style={{ minHeight: '320px', height: '100%' }}
                      />
                    </div>
                  </Col>

                  {/* Right Column: Full Advisory Content & Actions */}
                  <Col xs={12} lg={6} className="d-flex flex-column justify-content-between">
                    <div className="bulletin-crossfade" key={`content-${activeBulletin.id}`}>
                      {/* Meta Tags Row */}
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 pb-2 border-bottom border-light">
                        <div className="d-flex align-items-center gap-1.5 text-muted small fw-semibold">
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>
                            calendar_month
                          </span>
                          <span>{formatDate(activeBulletin.date)}</span>
                        </div>

                        <div className="d-flex align-items-center gap-1.5">
                          <Badge className={`px-2.5 py-1 text-capitalize ${activeBulletin.tagColor} border`} style={{ fontSize: '11px' }}>
                            {activeBulletin.tag}
                          </Badge>
                          {activeBulletin.eventKey && (
                            <Badge bg="secondary" className="px-2 py-0.5 border" style={{ fontSize: '9px', opacity: 0.85 }}>
                              Automated
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="fw-bold font-headline mb-3 text-dark" style={{ fontSize: '22px', lineHeight: 1.35 }}>
                        {activeBulletin.title}
                      </h3>

                      {/* Description */}
                      <p className="text-secondary mb-4" style={{ fontSize: '14.5px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {activeBulletin.desc}
                      </p>
                    </div>

                    {/* Actions & Carousel Mini Stepper */}
                    <div className="d-flex align-items-center justify-content-between pt-3 border-top border-light flex-wrap gap-3">
                      <div>
                        {activeBulletin.memoUrl ? (
                          <button
                            className="btn btn-primary d-inline-flex align-items-center gap-2 px-4 py-2 rounded-pill shadow-sm"
                            onClick={() => window.open(activeBulletin.memoUrl, '_blank')}
                            style={{ fontSize: '13px', fontWeight: 600 }}
                          >
                            <span>Read Full Directive</span>
                            <span className="material-symbols-outlined fs-6">arrow_forward</span>
                          </button>
                        ) : (
                          <span className="text-muted small d-inline-flex align-items-center gap-1">
                            <span className="material-symbols-outlined fs-6 text-success">verified</span>
                            Official Advisory
                          </span>
                        )}
                      </div>

                      {/* Stepper Navigation */}
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small fw-semibold me-1" style={{ fontSize: '12px' }}>
                          {String(activeIndex + 1).padStart(2, '0')} / {String(bulletins.length).padStart(2, '0')}
                        </span>
                        <button
                          className="bulletin-nav-btn"
                          onClick={handlePrev}
                          disabled={bulletins.length <= 1}
                          aria-label="Previous advisory"
                          style={{ width: '36px', height: '36px' }}
                        >
                          <span className="material-symbols-outlined fs-6">chevron_left</span>
                        </button>
                        <button
                          className="bulletin-nav-btn"
                          onClick={handleNext}
                          disabled={bulletins.length <= 1}
                          aria-label="Next advisory"
                          style={{ width: '36px', height: '36px' }}
                        >
                          <span className="material-symbols-outlined fs-6">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            )}

            {/* 🎞️ SYNCHRONIZED FILMSTRIP CAROUSEL DECK */}
            {bulletins.length > 1 && (
              <div
                className={`mx-auto sr-item${visible ? ' visible' : ''}`}
                style={{ maxWidth: '1080px' }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                  <div className="d-flex align-items-center gap-2">
                    <span className="material-symbols-outlined text-primary fs-5">view_carousel</span>
                    <span className="fw-bold text-dark font-headline" style={{ fontSize: '15px' }}>
                      All Bulletins & Advisories
                    </span>
                    <span className="badge bg-light text-secondary border rounded-pill px-2 py-0.5 small">
                      {bulletins.length} notices
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-1 text-muted small">
                    <span>Click any item to inspect</span>
                  </div>
                </div>

                {/* Horizontally Scrollable Filmstrip Track without scrollbar */}
                <div
                  ref={filmstripRef}
                  className="d-flex gap-3 overflow-x-auto pb-2 pt-1 px-1 bulletin-filmstrip-track"
                  style={{
                    scrollSnapType: 'x mandatory'
                  }}
                >
                  {bulletins.map((item, idx) => {
                    const isActive = activeIndex === idx;

                    return (
                      <button
                        key={item.id}
                        data-index={idx}
                        type="button"
                        className={`bulletin-filmstrip-card flex-shrink-0 ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveIndex(idx)}
                        style={{
                          width: '260px',
                          scrollSnapAlign: 'start',
                          cursor: 'pointer'
                        }}
                      >
                        {/* Mini Banner Header */}
                        <BulletinVisualBanner
                          bulletin={item}
                          variant="card"
                        />

                        {/* Card Body Info */}
                        <div className="p-3 d-flex flex-column justify-content-between flex-grow-1 w-100">
                          <div>
                            <div className="d-flex align-items-center justify-content-between gap-1 mb-2">
                              <span className="text-muted small fw-medium" style={{ fontSize: '11px' }}>
                                {formatDate(item.date)}
                              </span>
                              <Badge className={`px-2 py-0.5 text-capitalize ${item.tagColor} border`} style={{ fontSize: '9px' }}>
                                {item.tag}
                              </Badge>
                            </div>

                            <h6
                              className="fw-bold text-dark mb-1 text-truncate"
                              style={{ fontSize: '13px', lineHeight: 1.4 }}
                              title={item.title}
                            >
                              {item.title}
                            </h6>

                            <p
                              className="text-secondary small mb-0 text-truncate"
                              style={{ fontSize: '11.5px' }}
                            >
                              {item.desc}
                            </p>
                          </div>

                          {isActive && (
                            <div className="mt-2.5 pt-2 border-top border-light d-flex align-items-center justify-content-between">
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold d-inline-flex align-items-center gap-1" style={{ fontSize: '10px' }}>
                                <span className="spinner-grow spinner-grow-sm text-primary" style={{ width: '6px', height: '6px' }} />
                                Now Viewing
                              </span>
                              <span className="material-symbols-outlined text-primary fs-6">visibility</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Carousel Pagination Indicator Dots */}
                <div className="d-flex justify-content-center align-items-center gap-2 mt-3.5">
                  {bulletins.map((_, idx) => (
                    <button
                      key={idx}
                      className={`bulletin-dot${activeIndex === idx ? ' active' : ''}`}
                      onClick={() => setActiveIndex(idx)}
                      aria-label={`Jump to advisory ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Container>
    </section>
  );
};

export default HomeNews;
