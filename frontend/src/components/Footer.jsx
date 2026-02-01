import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer-shell">
      <Container>
        <Row className="gy-4">
          <Col lg={4}>
            <h5 className="footer-brand mb-3 text-white">AgroInOne</h5>
            <p className="mb-0 text-muted-soft">
              Empowering farmers with modern tools, AI predictions, and a seamless marketplace to grow business.
            </p>
          </Col>
          <Col sm={6} lg={2}>
            <h6 className="text-white mb-3">Quick Links</h6>
            <ul className="list-unstyled d-grid gap-2 mb-0">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/shop">Shop</Link></li>
              <li><Link to="/schemes">Schemes</Link></li>
            </ul>
          </Col>
          <Col sm={6} lg={3}>
            <h6 className="text-white mb-3">Services</h6>
            <ul className="list-unstyled d-grid gap-2 mb-0">
              <li><Link to="/predict/crop">Crop Advisory & Yield AI</Link></li>
              <li><Link to="/schemes">Govt Schemes Explorer</Link></li>
              <li><Link to="/helpdesk">Farmer Helpdesk</Link></li>
            </ul>
          </Col>
          <Col lg={3}>
            <h6 className="text-white mb-3">Contact</h6>
            <p className="mb-2">support@agroinone.com</p>
            <p className="mb-0">+91 1800-123-4567</p>
          </Col>
        </Row>
        <hr className="border-secondary-subtle my-4" />
        <div className="text-center small text-muted-soft">
          &copy; {new Date().getFullYear()} AgroInOne. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}