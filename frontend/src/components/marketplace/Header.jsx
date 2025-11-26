import React from 'react';
import { Container, InputGroup, FormControl, Row, Col, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

export default function Header() {
  return (
    <Container>
      <div className="marketplace-header p-3 p-md-4">
        <Row className="align-items-center g-3">
          <Col lg={6}>
            <p className="text-uppercase text-muted fw-semibold small mb-1">Marketplace</p>
            <h2 className="mb-0">Check shops and sellers near you</h2>
          </Col>
          <Col lg={6}>
            <InputGroup className="marketplace-search">
              <InputGroup.Text>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </InputGroup.Text>
              <FormControl placeholder="Search shops" aria-label="Search shops" />
              <Button variant="primary">Search</Button>
            </InputGroup>
          </Col>
        </Row>
      </div>
    </Container>
  );
}

