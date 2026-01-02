import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Spinner, Container } from 'react-bootstrap';

/**
 * ProtectedRoute Component
 * Declarative route guard preventing unauthenticated access to private views.
 * 
 * - While the auth state is rehydrating from localStorage, displays a clean loading spinner.
 * - If unauthenticated, safely redirects to "/" and passes the original pathname in navigation state.
 * - If authenticated, renders the requested child routes.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="success" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading session...</span>
          </Spinner>
          <p className="mt-3 text-muted fw-semibold">Verifying authentication session...</p>
        </div>
      </Container>
    );
  }

  if (!user) {
    // Preserve attempted destination in route state so user can be redirected back post-login
    return <Navigate to="/" state={{ from: location, openLogin: true }} replace />;
  }

  return children;
}
