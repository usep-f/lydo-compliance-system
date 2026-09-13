import React from 'react';
import { Container, Accordion } from 'react-bootstrap';

export const HomeFAQ: React.FC = () => {
  const faqs = [
    {
      q: 'How long does the SK registration verification take?',
      a: 'Registration applications are reviewed manually by Local Youth Development Office (LYDO) staff. Verification typically takes 24 to 48 business hours. You will receive an automated email confirmation once approved, containing a link to set up your password.'
    },
    {
      q: 'What file formats are accepted for compliance documents?',
      a: 'To guarantee digital permanence and readability, all compliance reports must be submitted as standard PDF documents (under 100MB). Plain images (PNG/JPG) are only allowed as proof files during the SK Official registration stage.'
    },
    {
      q: 'How is the compliance grading rate computed?',
      a: 'All compliance metrics are calculated client-side inside the dashboard. Scheduled documents (e.g. quarterly full disclosures, monthly regular minutes) have target timelines. If a deadline passes without an approved file, it is flagged as missing, which dynamically lowers the barangay rating.'
    },
    {
      q: 'What should I do if a document submission is denied?',
      a: 'Denials occur when files are corrupted, missing official signatures, or fail layout criteria. Denied submissions display review comments written by the auditor. Review the comments, address the issue in your original report, export to PDF, and upload it again.'
    }
  ];

  return (
    <section id="faq" className="home-faq-section bg-grid-light position-relative overflow-hidden">
      {/* 1. Subtle Masked Texture Overlay */}
      <div className="section-masked-texture-light" />

      {/* 2. Fluid Organic Morphing Blobs */}
      <div className="organic-blob organic-blob-blue" style={{ width: '400px', height: '400px', top: '-8%', right: '-5%', opacity: 0.25 }} />
      <div className="organic-blob organic-blob-amber" style={{ width: '360px', height: '360px', bottom: '-8%', left: '-5%', opacity: 0.22 }} />
      <div className="organic-blob organic-blob-cyan" style={{ width: '300px', height: '300px', top: '35%', left: '15%', opacity: 0.18 }} />

      {/* 3. Floating Decorative Spline Lines */}
      <svg className="floating-deco-lines" viewBox="0 0 1440 500" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="faq-grad-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#006EB7" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#00B4D8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7CB342" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="faq-grad-amber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FBA100" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#FFC133" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#006EB7" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path d="M-100,100 C300,300 700,50 1100,250 C1300,350 1500,100 1600,180" className="line-glow-blue" style={{ stroke: 'url(#faq-grad-blue)', opacity: 0.3 }} />
        <path d="M-50,380 C350,450 750,120 1150,320 C1300,420 1500,180 1650,260" className="line-glow-amber" style={{ stroke: 'url(#faq-grad-amber)', opacity: 0.3 }} />
      </svg>

      {/* 4. Floating Geometric Elements */}
      <div className="floating-geo-shape geo-diamond geo-diamond-blue" style={{ top: '15%', left: '8%' }} />
      <div className="floating-geo-shape-alt geo-concentric-ring geo-concentric-amber" style={{ bottom: '20%', right: '8%', width: '70px', height: '70px' }} />
      <div className="floating-geo-drift geo-cross geo-cross-blue" style={{ top: '22%', right: '12%' }} />
      <div className="floating-geo-twinkle geo-sparkle geo-sparkle-amber" style={{ top: '18%', left: '30%' }} />
      <div className="floating-geo-shape geo-hexagon geo-hexagon-blue" style={{ bottom: '15%', left: '6%' }} />

      <Container className="position-relative" style={{ zIndex: 2 }}>
        {/* Section Header */}
        <div className="text-center mb-4 sr-heading">
          <div className="home-section-overline" style={{ justifyContent: 'center' }}>
            Frequently Asked Questions
          </div>
          <h2 className="home-section-title mb-3">Compliance FAQ</h2>
          <p className="home-section-subtitle">
            Need help navigating the portal requirements? Review the responses below or get in touch with our helpdesk.
          </p>
        </div>

        {/* Accordion Layout */}
        <div className="mx-auto sr-item" style={{ maxWidth: '800px' }}>
          <Accordion className="faq-accordion">
            {faqs.map((faq, idx) => (
              <Accordion.Item eventKey={idx.toString()} key={idx}>
                <Accordion.Header>{faq.q}</Accordion.Header>
                <Accordion.Body>{faq.a}</Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      </Container>
    </section>
  );
};

export default HomeFAQ;
