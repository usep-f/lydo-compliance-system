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
    <section id="faq" className="py-5 bg-light border-bottom">
      <Container className="py-4">
        {/* Section Header */}
        <div className="text-center mb-5 sr-heading">
          <div className="text-primary fw-bold text-uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-headline)', fontSize: '12px' }}>
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
