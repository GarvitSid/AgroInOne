import React from 'react';
import { Col, Container, Row, Spinner } from 'react-bootstrap';
import PlaceDetails from './Placedetails';
import data from '../../api/placeDetails.json';
import './List.css';

export default function List() {
  return (
    <Container className="marketplace-shell">
      {data.length === 0 ? (
        <div className="loading-spinner"><Spinner animation="border" /></div>
      ) : (
        <Row className="g-4 marketplace-grid">
          {data.map((shop, index) => (
            <Col xs={12} md={6} lg={4} key={index}>
              <PlaceDetails shop={shop} />
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

