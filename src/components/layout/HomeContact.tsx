import React, { useState } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { useToast } from '../../context/ToastContext';

export const HomeContact: React.FC = () => {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate network submission
    setTimeout(() => {
      addToast('Your inquiry has been sent to the LYDO Helpdesk! We will contact you soon.', 'success');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setLoading(false);
    }, 1000);
  };

  return (
    <section id="contact" className="home-contact-section bg-grid-dark position-relative overflow-hidden">
      {/* 1. Subtle Masked Texture Overlay */}
      <div className="section-masked-texture" />

      {/* 2. Fluid Organic Morphing Blobs */}
      <div className="organic-blob organic-blob-blue" style={{ width: '520px', height: '520px', top: '-10%', left: '-5%', opacity: 0.45 }} />
      <div className="organic-blob organic-blob-amber" style={{ width: '420px', height: '420px', bottom: '-8%', right: '-5%', opacity: 0.4 }} />
      <div className="organic-blob organic-blob-gold" style={{ width: '320px', height: '320px', top: '35%', right: '25%', opacity: 0.25 }} />

      {/* 3. Floating Decorative Spline Lines */}
      <svg className="floating-deco-lines" viewBox="0 0 1440 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M-100,220 C350,80 750,450 1150,150 C1300,50 1450,300 1600,200" className="line-glow-blue" />
        <path d="M-50,450 C400,500 800,120 1200,380 C1350,480 1500,260 1650,340" className="line-glow-amber" />
      </svg>

      {/* 4. Floating Geometric Elements */}
      <div className="floating-geo-shape geo-diamond geo-diamond-amber" style={{ top: '15%', left: '5%' }} />
      <div className="floating-geo-shape-alt geo-concentric-ring geo-concentric-blue" style={{ bottom: '15%', right: '6%', width: '80px', height: '80px' }} />
      <div className="floating-geo-drift geo-cross geo-cross-blue" style={{ top: '22%', right: '12%' }} />
      <div className="floating-geo-twinkle geo-sparkle geo-sparkle-amber" style={{ top: '18%', left: '35%' }} />
      <div className="floating-geo-shape geo-hexagon geo-hexagon-amber" style={{ bottom: '22%', left: '8%' }} />
      <div className="floating-geo-drift geo-square-wire geo-square-wire-blue" style={{ bottom: '12%', right: '18%' }} />

      <Container className="position-relative" style={{ zIndex: 2 }}>
        {/* Section Header */}
        <div className="text-center mb-4 sr-heading">
          <div className="home-section-overline" style={{ justifyContent: 'center', color: '#FBA100' }}>
            Get In Touch
          </div>
          <h2 className="home-section-title home-section-title-white mb-3">Helpdesk & Support</h2>
          <p className="home-section-subtitle home-section-subtitle-muted">
            Have questions about compliance rules or need login support? Send our compliance officers a message.
          </p>
        </div>

        <Row className="gy-5">
          {/* Contact Details */}
          <Col lg={5} className="sr-item">
            <div className="p-4 p-lg-5 contact-info-card-dark h-100 d-flex flex-column justify-content-between">
              <div>
                <h5 className="fw-bold text-white mb-4 font-headline" style={{ fontSize: '18px', letterSpacing: '-0.01em' }}>
                  Local Youth Development Office
                </h5>
                
                {/* Location */}
                <div className="d-flex align-items-start gap-3 mb-4">
                  <div className="contact-icon-halo">
                    <span className="material-symbols-outlined">pin_drop</span>
                  </div>
                  <div>
                    <div className="fw-bold text-white small">Office Location</div>
                    <div className="text-white-50 small mt-0.5">2nd Floor, City Government Building, Lucena City, Philippines</div>
                  </div>
                </div>

                {/* Email */}
                <div className="d-flex align-items-start gap-3 mb-4">
                  <div className="contact-icon-halo">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <div>
                    <div className="fw-bold text-white small">Email Address</div>
                    <div className="text-white-50 small mt-0.5">lydo.compliance@lucena.gov.ph</div>
                  </div>
                </div>

                {/* Phone */}
                <div className="d-flex align-items-start gap-3 mb-4">
                  <div className="contact-icon-halo">
                    <span className="material-symbols-outlined">call</span>
                  </div>
                  <div>
                    <div className="fw-bold text-white small">Contact Number</div>
                    <div className="text-white-50 small mt-0.5">(042) 710-3456 / +63 912 345 6789</div>
                  </div>
                </div>

                {/* Hours */}
                <div className="d-flex align-items-start gap-3">
                  <div className="contact-icon-halo">
                    <span className="material-symbols-outlined">schedule</span>
                  </div>
                  <div>
                    <div className="fw-bold text-white small">Office Hours</div>
                    <div className="text-white-50 small mt-0.5">Monday – Friday: 8:00 AM – 5:00 PM (PST)</div>
                  </div>
                </div>
              </div>

              <div className="border-top border-white-50 border-opacity-10 pt-4 mt-4">
                <span className="text-white-50 small">Official correspondence and policy handbooks can be picked up during regular hours.</span>
              </div>
            </div>
          </Col>

          {/* Contact Form */}
          <Col lg={7} className="sr-item">
            <div className="p-4 p-lg-5 contact-form-card">
              <h5 className="fw-bold text-dark mb-4 font-headline" style={{ fontSize: '18px' }}>Send An Inquiry</h5>
              
              <Form onSubmit={handleSubmit}>
                <Row className="g-3 mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="form-label">Full Name</Form.Label>
                      <Form.Control 
                        type="text" 
                        required
                        placeholder="Juan Dela Cruz"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="form-label">Email Address</Form.Label>
                      <Form.Control 
                        type="email" 
                        required
                        placeholder="juan@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Subject</Form.Label>
                  <Form.Control 
                    type="text" 
                    required
                    placeholder="e.g. Password Reset Request / Compliance Guide Clarification"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="form-label">Inquiry Message</Form.Label>
                  <Form.Control 
                    as="textarea"
                    rows={4}
                    required
                    placeholder="Type your support request or questions..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    disabled={loading}
                  />
                </Form.Group>

                <Button 
                  type="submit" 
                  variant="primary" 
                  className="rounded-pill px-5 shadow-sm d-flex align-items-center gap-2"
                  disabled={loading}
                  style={{ height: '42px' }}
                >
                  <span className="material-symbols-outlined fs-5">send</span>
                  <span>{loading ? 'Submitting...' : 'Submit Inquiry'}</span>
                </Button>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default HomeContact;
