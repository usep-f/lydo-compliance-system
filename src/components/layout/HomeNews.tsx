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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  let currentItemsToShow = 3;
  let ratio = 3;

  if (windowWidth < 768) {
    currentItemsToShow = 1;
    ratio = bulletins.length > 1 ? 1.15 : 1;
  } else if (windowWidth < 992) {
    currentItemsToShow = 2;
    ratio = bulletins.length > 2 ? 2.15 : Math.max(1, bulletins.length);
  } else {
    currentItemsToShow = 3;
    ratio = bulletins.length > 3 ? 3.15 : Math.max(1, bulletins.length);
  }

  const maxIndex = Math.max(0, bulletins.length - currentItemsToShow);
  const hasOverflow = maxIndex > 0;

  // Auto-correct out-of-bounds index on resize
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

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
    <section id="news" className="py-5 bg-white border-bottom" ref={sectionRef}>
      <Container className="py-4">
        {loading ? (
          <div className="py-5 text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-secondary small">Syncing advisories...</p>
          </div>
        ) : bulletins.length === 0 ? (
          <div className="py-4 text-center">
            <div className="text-primary fw-bold text-uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-headline)', fontSize: '12px' }}>
              Office Advisories
            </div>
            <h2 className="home-section-title mb-3">Latest Bulletins & Advisories</h2>
            <p className="text-secondary small mb-0">No active bulletins or advisories posted at this time.</p>
          </div>
        ) : (
          <>
            {/* Section Header */}
            <div className={`text-center mb-5 sr-heading${visible ? ' visible' : ''}`}>
              <div className="text-primary fw-bold text-uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-headline)', fontSize: '12px' }}>
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
                style={{ zIndex: 10, left: '-20px' }}
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
                style={{ zIndex: 10, right: '-20px' }}
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
