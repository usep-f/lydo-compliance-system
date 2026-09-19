import React from 'react';
import { Container } from 'react-bootstrap';

export const HomeFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="home-footer-section py-4 text-white-50 position-relative overflow-hidden">
      {/* 1. Subtle Masked Texture Overlay */}
      <div className="section-masked-texture" style={{ opacity: 0.1 }} />

      {/* 2. Ambient Soft Blob */}
      <div className="organic-blob organic-blob-navy" style={{ width: '350px', height: '350px', bottom: '-20%', left: '30%', opacity: 0.3 }} />

      <Container className="position-relative" style={{ zIndex: 2 }}>
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 text-center text-md-start">
          <div>
            <div className="fw-semibold text-white mb-1" style={{ fontSize: '14px', fontFamily: 'var(--font-headline)', letterSpacing: '-0.02em' }}>
              LYDO Compliance System
            </div>
            <div style={{ fontSize: '12px' }}>
              Copyright &copy; {currentYear} Lucena City Local Youth Development Office. All Rights Reserved.
            </div>
          </div>
          
          <div className="d-flex align-items-center gap-3" style={{ fontSize: '12px' }}>
            <span className="text-secondary">|</span>
            <a 
              href="#faq" 
              className="text-white-50 text-decoration-none transition-all hover-text-white"
              onClick={e => {
                e.preventDefault();
                const el = document.getElementById('faq');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              FAQ
            </a>
            <span className="text-secondary">•</span>
            <a 
              href="#contact" 
              className="text-white-50 text-decoration-none transition-all hover-text-white"
              onClick={e => {
                e.preventDefault();
                const el = document.getElementById('contact');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Support
            </a>
            <span className="text-secondary">•</span>
            <a 
              href="/privacy-policy" 
              className="text-white-50 text-decoration-none transition-all hover-text-white"
              onClick={e => e.preventDefault()}
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default HomeFooter;
