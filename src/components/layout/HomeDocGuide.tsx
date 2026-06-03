import React, { useEffect, useRef, useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const guideCategories = [
  {
    title: 'Scheduled Submissions',
    frequency: 'Periodic',
    icon: 'schedule',
    cardClass: 'premium-card-blue',
    iconStyle: { background: 'rgba(0,110,183,0.1)', color: '#006EB7' },
    badgeStyle: { background: 'rgba(0,110,183,0.08)', color: '#006EB7', border: '1px solid rgba(0,110,183,0.2)' },
    docs: [
      { name: 'Regular Session Minutes', desc: 'Submitted monthly. Records resolutions and agenda of regular council meetings.' },
      { name: 'Full Disclosure Policy Board', desc: 'Submitted quarterly. Financial updates and project expenditures for public transparency.' },
      { name: 'KK Assembly Minutes', desc: 'Submitted semestally. Records assembly minutes of Katipunan ng Kabataan members.' }
    ]
  },
  {
    title: 'One-Time Submissions',
    frequency: 'ASAP',
    icon: 'notifications_active',
    cardClass: 'premium-card-amber',
    iconStyle: { background: 'rgba(251,161,0,0.1)', color: '#B45309' },
    badgeStyle: { background: 'rgba(251,161,0,0.08)', color: '#92400E', border: '1px solid rgba(251,161,0,0.25)' },
    docs: [
      { name: 'Directory of SK Officials', desc: 'Submitted upon assumption of office. Official list of elected and appointed leaders.' },
      { name: 'KK Membership Profiling', desc: 'Annual registry profiling all youth residents in the barangay.' },
      { name: 'Youth Organizations List', desc: 'Official registry of local youth organizations active within the community.' }
    ]
  },
  {
    title: 'Perennial Reporting',
    frequency: 'Ongoing',
    icon: 'draw',
    cardClass: 'premium-card-green',
    iconStyle: { background: 'rgba(124,179,66,0.1)', color: '#558B2F' },
    badgeStyle: { background: 'rgba(124,179,66,0.08)', color: '#3B6E16', border: '1px solid rgba(124,179,66,0.25)' },
    docs: [
      { name: 'Legislative Resolutions', desc: 'Ongoing submission of approved municipal and local youth legislation.' },
      { name: 'Accomplishment Reports', desc: 'Periodic logs documenting progress in education, health, and economic empowerment.' },
      { name: 'Project Evaluations', desc: 'Assesses the impact and fiscal execution of individual youth developmental projects.' }
    ]
  }
];

export const HomeDocGuide: React.FC = () => {
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

  return (
    <section id="guidelines" className="py-5 bg-white" ref={sectionRef}>
      <Container className="py-4">
        {/* Header */}
        <div className={`text-center mb-5 sr-heading${visible ? ' visible' : ''}`}>
          <div className="home-section-overline" style={{ justifyContent: 'center' }}>
            Compliance Guidelines
          </div>
          <h2 className="home-section-title mb-3">Required Compliance Documents</h2>
          <p className="home-section-subtitle">
            Understand the documentation framework and reporting milestones established by the Local Youth Development Office.
          </p>
        </div>

        {/* Cards */}
        <Row className="gy-4">
          {guideCategories.map((cat) => (
            <Col lg={4} key={cat.title} className={`sr-item${visible ? ' visible' : ''}`}>
              <div className={`premium-card ${cat.cardClass} h-100 p-4`}>
                {/* Card header */}
                <div className="d-flex align-items-center justify-content-between mb-4 pb-3" style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <div className="d-flex align-items-center gap-3">
                    <div
                      style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        ...cat.iconStyle
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                    </div>
                    <h5 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '15px', color: '#0F172A', margin: 0 }}>
                      {cat.title}
                    </h5>
                  </div>
                  <span
                    style={{
                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.05em', padding: '4px 12px', borderRadius: '9999px',
                      whiteSpace: 'nowrap', ...cat.badgeStyle
                    }}
                  >
                    {cat.frequency}
                  </span>
                </div>

                {/* Doc list */}
                <div className="d-flex flex-column gap-3">
                  {cat.docs.map((doc, di) => (
                    <div key={di} className="d-flex gap-3">
                      <div style={{ flexShrink: 0, marginTop: '2px' }}>
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1", color: cat.iconStyle.color }}
                        >
                          check_circle
                        </span>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', color: '#0F172A', marginBottom: '2px' }}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: '12.5px', lineHeight: 1.55, color: '#64748B' }}>
                          {doc.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
};

export default HomeDocGuide;
