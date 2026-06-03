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
    <section id="contact" className="py-5 bg-white border-bottom">
      <Container className="py-4">
        {/* Section Header */}
        <div className="text-center mb-5 sr-heading">
          <div className="text-primary fw-bold text-uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-headline)', fontSize: '12px' }}>
            Get In Touch
          </div>
          <h2 className="home-section-title mb-3">Helpdesk & Support</h2>
          <p className="home-section-subtitle">
            Have questions about compliance rules or need login support? Send our compliance officers a message.
          </p>
        </div>

        <Row className="gy-5">
          {/* Contact Details */}
          <Col lg={5} className="sr-item">
            <div className="p-4 bg-light rounded-3 border h-100 d-flex flex-column justify-content-between shadow-sm">
              <div>
                <h5 className="fw-bold text-dark mb-4 font-headline" style={{ fontSize: '16px' }}>Local Youth Development Office</h5>
                
                {/* Location */}
                <div className="d-flex gap-3 mb-4">
                  <div className="text-primary mt-0.5">
                    <span className="material-symbols-outlined">pin_drop</span>
                  </div>
                  <div>
                    <div className="fw-bold text-dark small">Office Location</div>
                    <div className="text-secondary small">2nd Floor, City Government Building, Lucena City, Philippines</div>
                  </div>
                </div>

                {/* Email */}
                <div className="d-flex gap-3 mb-4">
                  <div className="text-primary mt-0.5">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <div>
                    <div className="fw-bold text-dark small">Email Address</div>
                    <div className="text-secondary small">lydo.compliance@lucena.gov.ph</div>
                  </div>
                </div>

                {/* Phone */}
                <div className="d-flex gap-3 mb-4">
                  <div className="text-primary mt-0.5">
                    <span className="material-symbols-outlined">call</span>
                  </div>
                  <div>
                    <div className="fw-bold text-dark small">Contact Number</div>
                    <div className="text-secondary small">(042) 710-3456 / +63 912 345 6789</div>
                  </div>
                </div>

                {/* Hours */}
                <div className="d-flex gap-3">
                  <div className="text-primary mt-0.5">
                    <span className="material-symbols-outlined">schedule</span>
                  </div>
                  <div>
                    <div className="fw-bold text-dark small">Office Hours</div>
                    <div className="text-secondary small">Monday – Friday: 8:00 AM – 5:00 PM (PST)</div>
                  </div>
                </div>
              </div>

              <div className="border-top pt-4 mt-4">
                <span className="text-muted small">Official correspondence and policy handbooks can be picked up during regular hours.</span>
              </div>
            </div>
          </Col>

          {/* Contact Form */}
          <Col lg={7} className="sr-item">
            <div className="p-4 bg-white rounded-3 border shadow-sm">
              <h5 className="fw-bold text-dark mb-4 font-headline" style={{ fontSize: '16px' }}>Send An Inquiry</h5>
              
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
