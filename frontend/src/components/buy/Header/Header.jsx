import React from "react";
import "./Header.css";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShoppingCart } from "@fortawesome/free-solid-svg-icons";
import 'bootstrap/dist/css/bootstrap.min.css';
import logo from '../../../images/logo.png';
const Header = () => {
  return (
    <Container className="pt-3">
      <Navbar collapseOnSelect expand="lg" className="navbar-shell px-3 px-lg-4">
        <Container fluid>
          <Navbar.Brand href="/marketplace" className="d-flex align-items-center gap-2">
            <img
              alt="Marketplace logo"
              src={logo}
              width="40"
              height="40"
              className="rounded-circle"
            />
            <span>Marketplace</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="responsive-navbar-nav" />
          <Navbar.Collapse id="responsive-navbar-nav">
            <Nav className="ms-auto align-items-lg-center gap-lg-2 mt-3 mt-lg-0">
              <Nav.Link href="/">HOME</Nav.Link>
              <Nav.Link href="/shop">SHOP</Nav.Link>
              <Nav.Link href="/marketplace">MARKETPLACE</Nav.Link>
              <Link className="nav-link" to="/review/cart" aria-label="Cart">
                <FontAwesomeIcon icon={faShoppingCart} />
              </Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </Container>
  );
};

export default Header;
