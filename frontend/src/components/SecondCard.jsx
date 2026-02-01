import React from 'react';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import '../App.css';
import veggies from '../images/veggies.jpg';
import images from '../images//images.jpg';
import scheme from '../images/scheme.png';
import { Link } from 'react-router-dom';

function SecondCard() {
  return (
    <Container className="pb-5">
      <Row className="g-4">
        <Col lg={4}>
          <Card className="h-100 feature-card" id="card-left-bottom">
            <Card.Body className="d-flex flex-column p-4">
              <Card.Text className="card-below-text flex-grow-1 mb-4">
                Welcome to AgroInOne — a focused, modern agriculture platform built to help farmers discover tools, opportunities, and support faster.
              </Card.Text>
              <Link to="/schemes">
                <Button size="lg" className="home-shop-button w-100" variant="primary">
                  EXPLORE SCHEMES
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>

        <Col sm={6} lg={4}>
          <Card className="feature-card h-100">
            <Card.Img variant="top" src={veggies} style={{ height: '12rem' }} />
            <Card.Body className="d-flex flex-column p-4">
              <Card.Title className="text-center">AI PREDICTIONS</Card.Title>
              <Card.Text className="card-below-text feature-preview flex-grow-1">
                Get proactive crop recommendations based on soil nutrients and climate, paired with machine learning yield forecasts.
              </Card.Text>
              <Link to="/predict" className="mt-auto">
                <Button variant="outline-success" className="w-100">Try Predictions</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>

        <Col sm={6} lg={4}>
          <Card className="feature-card h-100">
            <Card.Img variant="top" src={scheme} style={{ height: '12rem' }} />
            <Card.Body className="d-flex flex-column p-4">
              <Card.Title className="text-center">GOVERNMENT SCHEMES</Card.Title>
              <Card.Text className="card-below-text feature-preview flex-grow-1">
                Explore key schemes with a clean, official layout that makes it easier to find the right support and next step.
              </Card.Text>
              <Link to="/schemes" className="mt-auto">
                <Button variant="outline-success" className="w-100">Learn More</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>

        <Col sm={6} lg={4}>
          <Card className="feature-card h-100">
            <Card.Img variant="top" src={images} style={{ height: '12rem' }} />
            <Card.Body className="d-flex flex-column p-4">
              <Card.Title className="text-center">HELPDESK</Card.Title>
              <Card.Text className="card-below-text feature-preview flex-grow-1">
                Friendly guidance and quick answers for farmers who need support, information, or help getting started.
              </Card.Text>
              <Link to="/helpdesk" className="mt-auto">
                <Button variant="outline-success" className="w-100">Learn More</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default SecondCard;
