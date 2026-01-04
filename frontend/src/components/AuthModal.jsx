import React, { useState, useContext } from 'react';
import { Modal, Form, Button, Tabs, Tab, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { authService } from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';

export function AuthModal({ show, onClose, onSuccess }) {
  const { login } = useContext(AuthContext);
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Clear errors when switching tabs
  const handleTabSelect = (selectedTab) => {
    setTab(selectedTab);
    setErrorMessage('');
  };

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', variant: 'secondary' };
    let score = 0;
    if (pwd.length >= 8) score += 40;
    if (/[0-9]/.test(pwd)) score += 30;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score += 30;

    if (score < 40) return { score, label: 'Too short (min 8 chars)', variant: 'danger' };
    if (score < 70) return { score, label: 'Medium (add number/symbol)', variant: 'warning' };
    return { score, label: 'Strong password', variant: 'success' };
  };

  const pwdStrength = getPasswordStrength(regPassword);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authService.login(loginEmail.trim(), loginPassword);
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name || 'Farmer'}!`);
      if (onSuccess) onSuccess(data.user);
      onClose();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMessage('Name, email, and password are required.');
      return;
    }

    if (regPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!/(?=.*[0-9])|(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(regPassword)) {
      setErrorMessage('Password must contain at least one number or special symbol.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authService.register(
        regName.trim(),
        regEmail.trim(),
        regPhone.trim(),
        regPassword
      );
      login(data.token, data.user);
      toast.success('Registration successful! Welcome to AgroInOne.');
      if (onSuccess) onSuccess(data.user);
      onClose();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered backdrop="static" className="auth-modal">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold fs-4">AgroInOne Account</Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-2 px-4 pb-4">
        {errorMessage && (
          <Alert variant="danger" className="py-2 px-3 small border-0 rounded-3 mb-3" dismissible onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        <Tabs activeKey={tab} onSelect={handleTabSelect} className="mb-4 nav-fill custom-auth-tabs">
          <Tab eventKey="login" title="Login">
            <Form onSubmit={handleLogin}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-secondary">Email Address</Form.Label>
                <Form.Control
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                  className="py-2"
                />
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Label className="small fw-semibold text-secondary">Password</Form.Label>
                <Form.Control
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="py-2"
                />
              </Form.Group>
              <Button variant="success" type="submit" className="w-100 py-2 fw-semibold rounded-3" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : 'Log In to AgroInOne'}
              </Button>
            </Form>
          </Tab>

          <Tab eventKey="register" title="Create Account">
            <Form onSubmit={handleRegister}>
              <Form.Group className="mb-2">
                <Form.Label className="small fw-semibold text-secondary">Full Name</Form.Label>
                <Form.Control
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Farmer Name"
                  required
                  className="py-2"
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label className="small fw-semibold text-secondary">Email Address</Form.Label>
                <Form.Control
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="farmer@example.com"
                  required
                  className="py-2"
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label className="small fw-semibold text-secondary">Mobile Number (Optional)</Form.Label>
                <Form.Control
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={13}
                  className="py-2"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-secondary">Password</Form.Label>
                <Form.Control
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 8 characters with number/symbol"
                  required
                  className="py-2"
                />
                {regPassword && (
                  <div className="mt-2">
                    <ProgressBar now={pwdStrength.score} variant={pwdStrength.variant} style={{ height: '6px' }} />
                    <div className="d-flex justify-content-between small text-muted mt-1">
                      <span>Strength</span>
                      <span className={`text-${pwdStrength.variant} fw-semibold`}>{pwdStrength.label}</span>
                    </div>
                  </div>
                )}
              </Form.Group>
              <Button variant="success" type="submit" className="w-100 py-2 fw-semibold rounded-3" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : 'Create Farmer Account'}
              </Button>
            </Form>
          </Tab>
        </Tabs>
      </Modal.Body>
    </Modal>
  );
}

export default AuthModal;
