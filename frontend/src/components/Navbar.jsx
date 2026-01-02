import React, { useState, useContext } from 'react';
import '../App.css';
import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import logo from '../images/logo.png';
import { AuthContext } from '../context/AuthContext';
import AuthModal from './AuthModal';
import { Link, useNavigate } from 'react-router-dom';

function NavBar() {
  const { user, logout } = useContext(AuthContext);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const navigate = useNavigate();

  return (
    <>
      <Container className="pt-3">
        <Navbar collapseOnSelect expand="lg" className="navbar-shell px-3 px-lg-4">
          <Container fluid>
            <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2">
              <img
                alt="AgroInOne Logo"
                src={logo}
                width="40"
                height="40"
                className="rounded-circle"
              />
              <span>AgroInOne</span>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="responsive-navbar-nav" />
            <Navbar.Collapse id="responsive-navbar-nav">
              <Nav className="ms-auto align-items-lg-center gap-lg-2 mt-3 mt-lg-0">
                <Nav.Link as={Link} to="/">HOME</Nav.Link>
                <Nav.Link as={Link} to="/schemes">SCHEMES</Nav.Link>
                <NavDropdown title="SERVICES" id="nav-services">
                  <NavDropdown.Item as={Link} to="/helpdesk">HELPDESK</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/predict">PREDICT</NavDropdown.Item>
                </NavDropdown>

                {user ? (
                  <NavDropdown title={user.name || 'Account'} id="nav-login">
                    <NavDropdown.Item as={Link} to="/profile">
                      MY PROFILE
                    </NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                    >
                      LOGOUT
                    </NavDropdown.Item>
                  </NavDropdown>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary ms-lg-2"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Login
                  </button>
                )}
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      </Container>
      <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={() => {}} />
    </>
  );
}

export default NavBar;
