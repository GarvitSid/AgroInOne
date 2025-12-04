import React from 'react';
import { Badge, Button, Card } from 'react-bootstrap';
import './Schemecard.css';
import defaultScheme from '../images/scheme.png';

export default function SchemeCard({ data }) {
  return (
    <Card className="scheme-card h-100 overflow-hidden">
      <Card.Img variant="top" src={data.Image || defaultScheme} alt={data.Scheme_Name || 'Scheme'} />
      <Card.Body className="scheme-card-body d-flex flex-column p-4">
        <div className="d-flex justify-content-between gap-3 align-items-start mb-3">
          <Card.Title className="mb-0 fs-5">{data.Scheme_Name}</Card.Title>
          <Badge bg="success" className="scheme-chip">{data.State || 'India'}</Badge>
        </div>
        <Card.Text className="scheme-preview text-muted flex-grow-1 mb-4">
          {data.Description}
        </Card.Text>
        <Button
          as="a"
          href={data.Links}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline-success"
          className="w-100"
        >
          Read More
        </Button>
      </Card.Body>
    </Card>
  );
}
