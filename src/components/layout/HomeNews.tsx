import React, { useEffect, useRef, useState } from 'react';
import { Container, Badge, Spinner } from 'react-bootstrap';
import { useCMSData } from '../../hooks/useCMSData';

export const HomeNews: React.FC = () => {
  const { bulletins, loading } = useCMSData();
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nudge, setNudge] = useState<'left' | 'right' | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const [prevBulletins, setPrevBulletins] = useState(bulletins);

  if (bulletins !== prevBulletins) {
    setPrevBulletins(bulletins);
    setCurrentIndex(0);
  }

  // Throttled window resize handler for smooth responsive calculations
  useEffect(() => {
    let rAFId: number;
    const handleResize = () => {
      cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(() => {
        setWindowWidth(window.innerWidth);
      });
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rAFId);
    };
  }, []);

  const currentItemsToShow = windowWidth < 768 ? 1 : windowWidth < 992 ? 2 : 3;
  const ratio = windowWidth < 768
    ? (bulletins.length > 1 ? 1.15 : 1)
    : windowWidth < 992
    ? (bulletins.length > 2 ? 2.15 : Math.max(1, bulletins.length))
    : (bulletins.length > 3 ? 3.15 : Math.max(1, bulletins.length));

  const maxIndex = Math.max(0, bulletins.length - currentItemsToShow);
  const hasOverflow = maxIndex > 0;

  // Auto-correct out-of-bounds index on resize synchronously during rendering
  if (currentIndex > maxIndex) {
    setCurrentIndex(maxIndex);
  }

  // Autoscroll
  useEffect(() => {
    if (maxIndex === 0 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [maxIndex, isHovered]);

  // Intersection observer for entrance animation
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
    if (maxIndex === 0) {
      setNudge('left');
      setTimeout(() => setNudge(null), 250);
      return;
    }
    setCurrentIndex((prev) => (prev === 0 ? maxIndex : prev - 1));
  };

  const handleNext = () => {
    if (maxIndex === 0) {
      setNudge('right');
      setTimeout(() => setNudge(null), 250);
      return;
    }
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  let transformValue = `translateX(-${currentIndex * (100 / ratio)}%)`;
  if (nudge === 'left') {
    transformValue += ' translateX(30px)';
  } else if (nudge === 'right') {
    transformValue += ' translateX(-30px)';
  }

  // Masking effect if there are more items than we can show
  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex === maxIndex;
  
  let maskImageStyle = 'none';
  if (hasOverflow) {
    if (!isAtStart && !isAtEnd) {
      // Fade both sides
      maskImageStyle = 'linear-gradient(to right, transparent, black 4%, black 96%, transparent)';
    } else if (isAtStart) {
      // Fade right side only
      maskImageStyle = 'linear-gradient(to right, black, black 96%, transparent)';
    } else if (isAtEnd) {
      // Fade left side only
      maskImageStyle = 'linear-gradient(to right, transparent, black 4%, black)';
    }
  }

  return (
    <section id="news" className="home-news-section bg-grid-light position-relative overflow-hidden" ref={sectionRef}>
      {/* 1. Subtle Masked Texture Overlay */}
      <div className="section-masked-texture-light" />

      {/* 2. Fluid Organic Morphing Blobs */}
      <div className="organic-blob organic-blob-blue" style={{ width: '420px', height: '420px', top: '-10%', left: '-5%', opacity: 0.28 }} />
      <div className="organic-blob organic-blob-amber" style={{ width: '380px', height: '380px', bottom: '-10%', right: '-5%', opacity: 0.24 }} />
      <div className="organic-blob organic-blob-green" style={{ width: '320px', height: '320px', top: '40%', right: '20%', opacity: 0.2 }} />

      {/* 3. Floating Decorative Spline Lines */}
      <svg className="floating-deco-lines" viewBox="0 0 1440 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="news-grad-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#006EB7" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#00B4D8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7CB342" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="news-grad-amber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FBA100" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#FFC133" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#006EB7" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path d="M-50,220 C350,80 750,450 1150,150 C1300,50 1450,300 1600,200" className="line-glow-blue" style={{ stroke: 'url(#news-grad-blue)', opacity: 0.35 }} />
        <path d="M-80,420 C400,550 780,120 1180,380 C1350,480 1500,260 1650,320" className="line-glow-amber" style={{ stroke: 'url(#news-grad-amber)', opacity: 0.35 }} />
      </svg>

      {/* 4. Floating Geometric Elements */}
      <div className="floating-geo-shape geo-diamond geo-diamond-blue" style={{ top: '15%', left: '4%' }} />
      <div className="floating-geo-shape-alt geo-concentric-ring geo-concentric-amber" style={{ bottom: '15%', right: '5%', width: '75px', height: '75px' }} />
      <div className="floating-geo-drift geo-cross geo-cross-emerald" style={{ top: '18%', right: '12%' }} />
      <div className="floating-geo-twinkle geo-sparkle geo-sparkle-amber" style={{ bottom: '25%', left: '15%' }} />
      <div className="floating-geo-shape geo-hexagon geo-hexagon-blue" style={{ bottom: '12%', left: '5%' }} />

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
            <div className={`text-center mb-4 sr-heading${visible ? ' visible' : ''}`}>
              <div className="home-section-overline" style={{ justifyContent: 'center' }}>
                Office Advisories
              </div>
              <h2 className="home-section-title mb-3">Latest Bulletins & Advisories</h2>
              <p className="home-section-subtitle">
                Stay informed with the latest directives, compliance circulars, and system notices released by the Local Youth Development Office.
              </p>
            </div>

            {/* Slider Wrapper Centered */}
            <div 
              className={`slider-wrapper position-relative mx-auto mt-4 sr-item${visible ? ' visible' : ''}`} 
              style={{ maxWidth: '1000px' }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Left Arrow Button */}
              <button 
                className={`btn-slider btn-slider-left${maxIndex === 0 ? ' btn-slider-disabled' : ''}`}
                onClick={handlePrev}
                aria-label="Previous bulletin"
                style={{ zIndex: 10 }}
              >
                <span className="material-symbols-outlined fs-5">chevron_left</span>
              </button>

              {/* Slider Viewport Container */}
              <div 
                className="overflow-hidden px-1 py-3 mx-auto" 
                style={{ 
                  WebkitMaskImage: maskImageStyle,
                  maskImage: maskImageStyle,
                  transition: 'mask-image 0.4s ease, -webkit-mask-image 0.4s ease'
                }}
              >
                <div 
                  className="d-flex"
                  style={{
                    transform: transformValue,
                    transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
                  }}
                >
                  {bulletins.map((item) => {
                    const dateStr = item.date?.toDate
                      ? item.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : new Date((item.date as unknown as { toMillis?: () => number }).toMillis?.() || (item.date as unknown as string | number)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                    return (
                      <div key={item.id} className="flex-shrink-0 px-2" style={{ width: `${100 / ratio}%` }}>
                        <div className="premium-announcement-card d-flex flex-column justify-content-between h-100" style={{ minHeight: '260px' }}>
                          <div>
                            {/* Meta info header */}
                            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom border-light">
                              <div className="d-flex align-items-center gap-1.5 text-muted small fw-semibold">
                                <span className="material-symbols-outlined text-secondary" style={{ fontSize: '16px' }}>calendar_month</span>
                                <span>{dateStr}</span>
                              </div>
                              <div className="d-flex align-items-center gap-1">
                                <Badge className={`px-2.5 py-1 text-capitalize ${item.tagColor} border`} style={{ fontSize: '10px' }}>
                                  {item.tag}
                                </Badge>
                                {item.eventKey && (
                                  <Badge bg="secondary" className="px-1.5 py-0.5 border" style={{ fontSize: '8px', opacity: 0.8 }} title="Automated alert">
                                    Auto
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Title */}
                            <h5 className="premium-announcement-card-title mb-3">
                              {item.title}
                            </h5>

                            {/* Description */}
                            <p className="premium-announcement-card-desc mb-0">
                              {item.desc}
                            </p>
                          </div>
                          
                          {/* Action Button */}
                          {item.memoUrl && (
                            <div className="d-flex align-items-center justify-content-start mt-4 pt-3 border-top border-light">
                              <button 
                                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 px-3.5 py-2 rounded-pill shadow-none"
                                onClick={() => window.open(item.memoUrl, '_blank')}
                                style={{ 
                                  fontSize: '12px', 
                                  border: '1px solid rgba(0, 110, 183, 0.25)', 
                                  backgroundColor: 'rgba(0, 110, 183, 0.03)',
                                  fontWeight: 600
                                }}
                              >
                                <span>Read More</span>
                                <span className="material-symbols-outlined fs-6" style={{ fontVariationSettings: "'wght' 600" }}>arrow_right_alt</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Arrow Button */}
              <button 
                className={`btn-slider btn-slider-right${maxIndex === 0 ? ' btn-slider-disabled' : ''}`}
                onClick={handleNext}
                aria-label="Next bulletin"
                style={{ zIndex: 10 }}
              >
                <span className="material-symbols-outlined fs-5">chevron_right</span>
              </button>
            </div>

            {/* Carousel Pagination Indicator Dots */}
            {maxIndex > 0 && (
              <div className="d-flex justify-content-center gap-2 mt-4">
                {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                  <button
                    key={idx}
                    className={`bulletin-dot${currentIndex === idx ? ' active' : ''}`}
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to slide group ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Container>
    </section>
  );
};

export default HomeNews;
