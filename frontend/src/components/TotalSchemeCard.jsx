import * as React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import SchemeCard from './SchemeCard';

export default function SelectDropdown(props) {
  const { data, state } = props;

  const heading = state === "" ? "All India" : state;

  return (
    <>
      <Container className="mb-4">
        <Row className="justify-content-center">
          <Col lg={10}>
            <h2 className='scheme-heading'>{heading}</h2>
            <p className="text-muted mb-0">Official government scheme listings in a clean, easy-to-scan format.</p>
          </Col>
        </Row>
      </Container>
      <Container>
        <Row className="g-4">
          {data.map((element, index) => (
            <Col lg={6} key={index}>
              <SchemeCard data={element} />
            </Col>
          ))}
        </Row>
      </Container>
    </>
  );
}
