import React from 'react';
import { Badge, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone } from '@fortawesome/free-solid-svg-icons';

export default function PlaceDetails({ shop }) {
  return (
    <Card className="marketplace-card h-100">
      <Card.Img variant="top" src={shop.Picture} alt={shop.Name} />
      <Card.Body className="d-flex flex-column p-4">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <Card.Title className="mb-0 fs-5">{shop.Name}</Card.Title>
          <Badge className="marketplace-badge">Shop</Badge>
        </div>
        <Card.Text className="marketplace-meta text-muted mb-2">
          <strong>Owner:</strong> {shop.Owner}
        </Card.Text>
        <Card.Text className="marketplace-meta text-muted mb-4 d-flex align-items-center gap-2">
          <FontAwesomeIcon icon={faPhone} /> {shop.Phone}
        </Card.Text>
        <Button as={Link} to="/marketplace" variant="primary" className="mt-auto w-100">
          BUY NOW
        </Button>
      </Card.Body>
    </Card>
  );
}

