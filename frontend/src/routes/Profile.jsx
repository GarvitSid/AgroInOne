import React, { useContext } from 'react';
import { Container, Card, Row, Col, Badge } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import NavBar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * Profile Placeholder Route (Step 3)
 * Full rich dashboard with statistics and quick actions will be built in Step 4.
 */
export default function Profile() {
  const { user } = useContext(AuthContext);

  return (
    <>
      <NavBar />
      <Container className="my-5 pt-3">
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="shadow-sm border-0 rounded-4 p-4 text-center">
              <div className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10 text-success fw-bold" style={{ width: 80, height: 80, fontSize: '2rem' }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'F'}
              </div>
              <h3 className="fw-bold mb-1">{user?.name || 'Farmer Member'}</h3>
              <p className="text-muted mb-3">{user?.email || 'farmer@agroinone.com'}</p>
              <div>
                <Badge bg="success" className="px-3 py-2 rounded-pill fw-semibold">
                  Verified Farmer Account
                </Badge>
              </div>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}
