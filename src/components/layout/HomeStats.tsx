import React, { useEffect, useRef, useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import type { ComplianceData } from '../../hooks/useComplianceData';

interface HomeStatsProps {
  liveData: ComplianceData | null;
  totalSubmissionsCount: number;
}

function useCountUp(target: number, isVisible: boolean, duration = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      const resetId = requestAnimationFrame(() => setValue(0));
      return () => cancelAnimationFrame(resetId);
    }
    const start = performance.now();
    let frameId: number;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [isVisible, target, duration]);

  return value;
}

export const HomeStats: React.FC<HomeStatsProps> = ({ liveData, totalSubmissionsCount }) => {
  const overallRate       = liveData ? liveData.overallRate          : 88;
  const compliantCount    = liveData ? liveData.fullyCompliantCount  : 29;
  const totalBarangays    = liveData ? liveData.totalBarangays       : 33;
  const submissionsCount  = liveData ? totalSubmissionsCount         : 512;
  const pendingCount      = liveData ? liveData.pendingReviewCount   : 14;

  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const animatedRate       = useCountUp(overallRate, visible);
  const animatedCompliant  = useCountUp(compliantCount, visible);
  const animatedTotal      = useCountUp(totalBarangays, visible);
  const animatedSubs       = useCountUp(submissionsCount, visible, 1800);
  const animatedPending    = useCountUp(pendingCount, visible);

  const cards = [
    {
      variant: 'primary',
      icon: 'verified',
      iconClass: 'stat-icon-blue',
      label: 'Overall Compliance',
      desc: 'City-wide average rating across scheduled, ASAP, and perennial submissions.',
      value: `${animatedRate}%`,
      progress: animatedRate,
      progressClass: 'stat-progress-primary',
      barVariant: 'stat-dark-card-primary',
      sub: `${Math.round(animatedRate)}% of all documentation met`
    },
    {
      variant: 'success',
      icon: 'emoji_events',
      iconClass: 'stat-icon-green',
      label: 'Compliant Branches',
      desc: 'SK councils with 100% compliance records in the current reporting period.',
      value: `${animatedCompliant}`,
      sub: `out of ${animatedTotal} barangays`,
      progress: Math.round((animatedCompliant / totalBarangays) * 100),
      progressClass: 'stat-progress-success',
      barVariant: 'stat-dark-card-success',
    },
    {
      variant: 'amber',
      icon: 'folder_zip',
      iconClass: 'stat-icon-amber',
      label: 'Documents Processed',
      desc: 'Total compliance documents submitted, verified, and cataloged in the system.',
      value: `${animatedSubs}`,
      sub: `${animatedPending} pending verification`,
      progress: Math.round(((animatedSubs - animatedPending) / animatedSubs) * 100) || 0,
      progressClass: 'stat-progress-amber',
      barVariant: 'stat-dark-card-amber',
    }
  ];

  return (
    <section
      id="stats"
      className="home-stats-section py-5"
      ref={sectionRef}
    >
      <div 
        className="stats-blackout-mask"
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000000',
          opacity: visible ? 0 : 1,
          transition: 'opacity 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none',
          zIndex: 3
        }}
      />
      <Container className="py-4" style={{ position: 'relative', zIndex: 2 }}>
        {/* Section Header */}
        <div className={`text-center mb-5 sr-heading${visible ? ' visible' : ''}`}>
          <div className="home-section-overline" style={{ justifyContent: 'center', color: 'rgba(92,184,255,0.8)' }}>
            Compliance Overview
          </div>
          <h2 className="home-section-title home-section-title-white mb-3">System Compliance Status</h2>
          <p className="home-section-subtitle home-section-subtitle-muted">
            Public real-time tracking of submission status and overall administrative progress across all Sangguniang Kabataan branches.
          </p>
        </div>

        {/* Cards Grid */}
        <Row className="gy-4 justify-content-center">
          {cards.map((card, i) => (
            <Col md={6} lg={4} key={card.label} className={`sr-item${visible ? ' visible' : ''}`}>
              <div className={`stat-dark-card ${card.barVariant} h-100`}>
                {/* Icon */}
                <div className={`stat-icon ${card.iconClass}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>{card.icon}</span>
                </div>

                {/* Value */}
                <div className="stat-value">{card.value}</div>

                {/* Label */}
                <div className="stat-label">{card.label}</div>

                {/* Description */}
                <div className="stat-desc">{card.desc}</div>

                {/* Progress bar */}
                <div className="stat-progress-bar">
                  <div
                    className={`stat-progress-fill ${card.progressClass}`}
                    style={{
                      width: visible ? `${Math.min(card.progress, 100)}%` : '0%',
                      transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      transitionDelay: `${i * 120}ms`
                    }}
                  />
                </div>

                {/* Sub-note */}
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', fontFamily: 'var(--font-body)' }}>
                  {card.sub}
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Public disclaimer */}
        {!liveData && (
          <div className={`text-center mt-5 sr-heading${visible ? ' visible' : ''}`}>
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                padding: '12px 24px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '13px', backdropFilter: 'blur(8px)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#5CB8FF' }}>info</span>
              <span>Public snapshot. SK Officials may sign in to view live compliance matrices.</span>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
};

export default HomeStats;
