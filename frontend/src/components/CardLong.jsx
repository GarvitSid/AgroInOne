import React from 'react';
import { Button, Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import '../App.css';
import image from '../images/image.png';

function CardLong() {
  return (
    <section className="hero-section">
      <Container>
        <Row className="hero-card align-items-stretch g-0">
          <Col lg={6} className="hero-copy d-flex flex-column justify-content-center">
            <span className="hero-eyebrow">Agro-tech platform</span>
            <h1 className="hero-title">
              Empowering Indian farmers with technology, clarity, and growth.
            </h1>
            <p className="hero-text fs-5 mb-0">
              Explore a cleaner marketplace, practical AI predictions, and government scheme access in one modern, trustworthy experience.
            </p>
            <div className="hero-actions">
              <Link to="/shop">
                <Button variant="primary" size="lg">Explore Marketplace</Button>
              </Link>
              <Link to="/predict">
                <Button variant="outline-success" size="lg">Try Predictions</Button>
              </Link>
            </div>
          </Col>
          <Col lg={6} className="hero-media">
            <img src={image} alt="Farmers working in a field" />
          </Col>
        </Row>
      </Container>
    </section>
  );
}

export default CardLong;
