import React, { useContext, useEffect, useState } from 'react';
import { Container, Card, Row, Col, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { authService } from '../api/axiosConfig';
import NavBar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Profile() {
  const { user, logout } = useContext(AuthContext);
  const [profileData, setProfileData] = useState(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      try {
        const { data } = await authService.getProfile();
        if (isMounted && data?.user) {
          setProfileData(data.user);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.error || 'Could not refresh latest profile data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchProfile();
    return () => { isMounted = false; };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initial = profileData?.name ? profileData.name.charAt(0).toUpperCase() : 'F';

  return (
    <>
      <NavBar />
      <Container className="my-5 pt-3">
        <Row className="justify-content-center">
          <Col lg={8}>
            {error && (
              <Alert variant="warning" dismissible onClose={() => setError(null)} className="rounded-3 border-0 shadow-sm mb-4">
                {error}
              </Alert>
            )}

            {/* Profile Overview Card */}
            <Card className="shadow-sm border-0 rounded-4 p-4 mb-4 bg-white">
              <div className="d-flex flex-column flex-md-row align-items-center gap-4 text-center text-md-start">
                <div
                  className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold shadow-sm"
                  style={{ width: '90px', height: '90px', fontSize: '2.5rem', flexShrink: 0 }}
                >
                  {initial}
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-md-start gap-2 mb-1">
                    <h2 className="fw-bold mb-0 text-dark">{profileData?.name || 'Farmer Member'}</h2>
                    <Badge bg="success" className="px-3 py-1 rounded-pill fw-normal">
                      Verified Member
                    </Badge>
                  </div>
                  <p className="text-muted mb-2">{profileData?.email || 'farmer@agroinone.com'}</p>
                  {profileData?.phone && (
                    <p className="small text-secondary mb-0">
                      <strong>Phone:</strong> {profileData.phone}
                    </p>
                  )}
                </div>
                <Button variant="outline-danger" onClick={handleLogout} className="px-4 py-2 rounded-3 fw-semibold">
                  Log Out
                </Button>
              </div>
            </Card>

            {/* Quick Actions & Platform Services */}
            <h5 className="fw-bold text-dark mb-3 px-1">Farmer Services & Quick Access</h5>
            <Row className="g-3">
              <Col md={4}>
                <Card className="border-0 shadow-sm rounded-4 p-3 h-100 bg-white">
                  <h6 className="fw-bold text-success mb-2">Crop Advisory & Yield AI</h6>
                  <p className="small text-muted mb-3">
                    Two-stage agronomic pipeline: recommend top suitable crops from soil & climate, then forecast harvest yield.
                  </p>
                  <Button as={Link} to="/predict/crop" variant="outline-success" size="sm" className="mt-auto rounded-pill fw-semibold">
                    Advisory & Yield &rarr;
                  </Button>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="border-0 shadow-sm rounded-4 p-3 h-100 bg-white">
                  <h6 className="fw-bold text-success mb-2">Govt Schemes</h6>
                  <p className="small text-muted mb-3">
                    Discover national and state subsidies, direct income support, and equipment programs.
                  </p>
                  <Button as={Link} to="/schemes" variant="outline-success" size="sm" className="mt-auto rounded-pill fw-semibold">
                    Browse Schemes &rarr;
                  </Button>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="border-0 shadow-sm rounded-4 p-3 h-100 bg-white">
                  <h6 className="fw-bold text-success mb-2">Farmer Helpdesk</h6>
                  <p className="small text-muted mb-3">
                    Submit grievance tickets, track resolution status, and reach agricultural field support.
                  </p>
                  <Button as={Link} to="/helpdesk" variant="outline-success" size="sm" className="mt-auto rounded-pill fw-semibold">
                    Go to Helpdesk &rarr;
                  </Button>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
      <Footer />
    </>
  );
}
