import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Badge from 'react-bootstrap/Badge';
import Collapse from 'react-bootstrap/Collapse';
import { toast } from 'react-toastify';
import { Predictloan } from '../../api/predictloan';
import './pred.css';

export default function PredictLoan() {
  const formRef = useRef(null);
  const resultRef = useRef(null);

  // Demographic & Household State
  const [Gender, setGender] = useState('');
  const [Married, setMarried] = useState('');
  const [Dependent, setDependent] = useState('');
  const [Education, setEducation] = useState('');
  const [SelfEmp, setSelfEmp] = useState('');
  const [Area, setArea] = useState('');

  // Financial & Credit State
  const [ApInc, setApInc] = useState('');
  const [CoInc, setCoInc] = useState('');
  const [LoanAmount, setLoanAmount] = useState('');
  const [Loanterm, setLoanterm] = useState('');
  const [Credithistory, setCredithistory] = useState('');

  // Optional Agrarian Exposure State
  const [showAgrarian, setShowAgrarian] = useState(false);
  const [LandSize, setLandSize] = useState('2.0');
  const [InputCost, setInputCost] = useState('15000');
  const [CropLoss, setCropLoss] = useState('Never');
  const [BorrowSrc, setBorrowSrc] = useState('Bank');

  // UI & Response State
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [legacyAns, setLegacyAns] = useState('');

  // Quick preset fills
  const handleQuickFill = (type) => {
    if (type === 'low-risk') {
      setGender('Male');
      setMarried('Yes');
      setDependent('2');
      Education ? setEducation('Graduate') : setEducation('Graduate');
      setSelfEmp('Yes');
      setArea('Rural');
      setApInc('35000');
      setCoInc('15000');
      setLoanAmount('150000');
      setLoanterm('60');
      setCredithistory('No dues');
      setLandSize('4.0');
      setInputCost('12000');
      setCropLoss('Never');
      setBorrowSrc('Bank');
      setShowAgrarian(true);
      toast.info('Loaded low-risk progressive farmer preset');
    } else if (type === 'high-risk') {
      setGender('Male');
      setMarried('No');
      setDependent('3+');
      setEducation('Not Graduate');
      setSelfEmp('Yes');
      setArea('Rural');
      setApInc('8000');
      setCoInc('0');
      setLoanAmount('1500000');
      setLoanterm('36');
      setCredithistory('Dues');
      setLandSize('1.5');
      setInputCost('25000');
      setCropLoss('Frequent');
      setBorrowSrc('Moneylender');
      setShowAgrarian(true);
      toast.info('Loaded high-risk distressed applicant preset');
    } else {
      setGender('');
      setMarried('');
      setDependent('');
      setEducation('');
      setSelfEmp('');
      setArea('');
      setApInc('');
      setCoInc('');
      setLoanAmount('');
      setLoanterm('');
      setCredithistory('');
      setLandSize('2.0');
      setInputCost('15000');
      setCropLoss('Never');
      setBorrowSrc('Bank');
      setShowAgrarian(false);
      setResultData(null);
      setLegacyAns('');
      toast.info('Form cleared');
    }
  };

  const handleClick = async () => {
    const newErrors = {};
    if (!Gender) newErrors.Gender = 'Gender is required';
    if (!Married) newErrors.Married = 'Marital status is required';
    if (!Dependent) newErrors.Dependent = 'Dependents field is required';
    if (!Education) newErrors.Education = 'Education is required';
    if (!SelfEmp) newErrors.SelfEmp = 'Self employment status required';
    if (!ApInc || isNaN(ApInc) || Number(ApInc) <= 0) newErrors.ApInc = 'Enter a valid positive applicant income';
    if (CoInc === '' || isNaN(CoInc) || Number(CoInc) < 0) newErrors.CoInc = 'Enter valid co-applicant income';
    if (!LoanAmount || isNaN(LoanAmount) || Number(LoanAmount) <= 0) newErrors.LoanAmount = 'Enter valid loan amount';
    if (!Loanterm || isNaN(Loanterm) || Number(Loanterm) <= 0) newErrors.Loanterm = 'Enter valid loan term in months';
    if (!Credithistory) newErrors.Credithistory = 'Credit history required';
    if (!Area) newErrors.Area = 'Property area type required';

    if (Object.keys(newErrors).length > 0) {
      toast.warning('Please complete all required fields properly');
      return;
    }

    const payload = {
      gender: Gender,
      married: Married,
      dependent: Dependent,
      education: Education,
      self_emp: SelfEmp,
      income: Number(ApInc),
      coap_income: Number(CoInc),
      loan_amount: Number(LoanAmount),
      loan_term: Number(Loanterm),
      credit_history: Credithistory,
      prop_area: Area,
      land_size: Number(LandSize || 2.0),
      input_cost: Number(InputCost || 15000),
      crop_loss_frequency: CropLoss || 'Never',
      borrowing_source: BorrowSrc || 'Bank'
    };

    try {
      setLoading(true);
      setResultData(null);
      setLegacyAns('');

      const response = await Predictloan(payload);

      if (response && response.approved !== undefined) {
        setResultData(response);
        if (response.approved) {
          toast.success('Loan eligibility evaluation: APPROVED');
        } else {
          toast.warning('Loan eligibility evaluation: HIGH RISK / DENIED');
        }
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else if (response && response.ans === 1) {
        setLegacyAns('✓ Loan has been approved');
        toast.success('Loan likely to be approved');
      } else {
        setLegacyAns(JSON.stringify(response));
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Prediction failed. Please check network connectivity.';
      toast.error(errMsg);
      setLegacyAns(`Evaluation error: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper for DTI badge color
  const getDtiBadge = (dtiPct) => {
    if (dtiPct <= 35) {
      return <Badge bg="success" className="ms-2">Safe (≤ 35%)</Badge>;
    } else if (dtiPct <= 50) {
      return <Badge bg="warning" text="dark" className="ms-2">Moderate (35–50%)</Badge>;
    }
    return <Badge bg="danger" className="ms-2">Critical (&gt; 50%)</Badge>;
  };

  return (
    <Container className="py-4">
      <div className="text-center mb-4">
        <h1 className="page-heading">Agricultural Credit & Loan Eligibility Advisor</h1>
        <p className="text-muted mx-auto" style={{ maxWidth: '720px' }}>
          AI-driven agrarian underwriting evaluating credit repayment history, debt-to-income (DTI) ratio,
          disposable surplus after farm operational costs, and recommended government safety nets.
        </p>
      </div>

      <div className="row justify-content-center">
        <div className="col-xl-10 col-xxl-9">
          <Card className="form-card p-4 p-md-5" ref={formRef}>
            {/* Quick Presets */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4 p-3 bg-light rounded-3">
              <span className="fw-semibold text-secondary small">⚡ Quick Benchmark Profiles:</span>
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="quick-fill-btn"
                  onClick={() => handleQuickFill('low-risk')}
                >
                  🌱 Low-Risk Farmer
                </button>
                <button
                  type="button"
                  className="quick-fill-btn"
                  onClick={() => handleQuickFill('high-risk')}
                >
                  ⚠️ High-Risk Profile
                </button>
                <button
                  type="button"
                  className="quick-fill-btn text-danger"
                  onClick={() => handleQuickFill('reset')}
                >
                  Reset
                </button>
              </div>
            </div>

            <Form onSubmit={(e) => { e.preventDefault(); handleClick(); }}>
              {/* Section 1: Demographics */}
              <div className="diagnostic-section mb-4">
                <div className="diagnostic-header">
                  <span className="step-badge geo">1</span>
                  <h3>Applicant Demographics & Household</h3>
                </div>
                <Row className="g-3">
                  <Col md={4} sm={6}>
                    <Form.Group>
                      <Form.Label>Gender</Form.Label>
                      <Form.Select value={Gender} onChange={(e) => setGender(e.target.value)} required>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={4} sm={6}>
                    <Form.Group>
                      <Form.Label>Marital Status</Form.Label>
                      <Form.Select value={Married} onChange={(e) => setMarried(e.target.value)} required>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={4} sm={6}>
                    <Form.Group>
                      <Form.Label>Dependents</Form.Label>
                      <Form.Select value={Dependent} onChange={(e) => setDependent(e.target.value)} required>
                        <option value="">Select</option>
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3+">3+</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={4} sm={6}>
                    <Form.Group>
                      <Form.Label>Education</Form.Label>
                      <Form.Select value={Education} onChange={(e) => setEducation(e.target.value)} required>
                        <option value="">Select</option>
                        <option value="Graduate">Graduate</option>
                        <option value="Not Graduate">Not Graduate</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={4} sm={6}>
                    <Form.Group>
                      <Form.Label>Self Employed</Form.Label>
                      <Form.Select value={SelfEmp} onChange={(e) => setSelfEmp(e.target.value)} required>
                        <option value="">Select</option>
                        <option value="Yes">Yes (Farmer / Trader)</option>
                        <option value="No">No (Salaried / Wage)</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={4} sm={6}>
                    <Form.Group>
                      <Form.Label>Property Location</Form.Label>
                      <Form.Select value={Area} onChange={(e) => setArea(e.target.value)} required>
                        <option value="">Select</option>
                        <option value="Rural">Rural</option>
                        <option value="Semiurban">Semiurban</option>
                        <option value="Urban">Urban</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {/* Section 2: Financial & Credit Baseline */}
              <div className="diagnostic-section mb-4">
                <div className="diagnostic-header">
                  <span className="step-badge soil">2</span>
                  <h3>Financial Capacity & Credit Baseline</h3>
                </div>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Applicant Monthly Income (₹)</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        value={ApInc}
                        onChange={(e) => setApInc(e.target.value)}
                        placeholder="e.g. 35000"
                        required
                      />
                      <div className="metric-hint">Primary household earner monthly earnings</div>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Co-applicant Monthly Income (₹)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        value={CoInc}
                        onChange={(e) => setCoInc(e.target.value)}
                        placeholder="e.g. 15000 (0 if none)"
                        required
                      />
                      <div className="metric-hint">Secondary family earner or spouse income</div>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Requested Loan Principal (₹)</Form.Label>
                      <Form.Control
                        type="number"
                        min="1000"
                        value={LoanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                        placeholder="e.g. 150000 for ₹1.5 Lakhs"
                        required
                      />
                      <div className="metric-hint">Accepts full rupees (e.g. 150000) or thousands (150)</div>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Loan Term (Months)</Form.Label>
                      <Form.Select
                        value={Loanterm}
                        onChange={(e) => setLoanterm(e.target.value)}
                        required
                      >
                        <option value="">Select Repayment Term</option>
                        <option value="12">12 Months (1 Year)</option>
                        <option value="24">24 Months (2 Years)</option>
                        <option value="36">36 Months (3 Years)</option>
                        <option value="60">60 Months (5 Years)</option>
                        <option value="120">120 Months (10 Years)</option>
                        <option value="180">180 Months (15 Years)</option>
                        <option value="240">240 Months (20 Years)</option>
                        <option value="360">360 Months (30 Years)</option>
                      </Form.Select>
                      <div className="metric-hint">Amortization duration for EMI calculation</div>
                    </Form.Group>
                  </Col>

                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>Credit Bureau Track Record</Form.Label>
                      <Form.Select
                        value={Credithistory}
                        onChange={(e) => setCredithistory(e.target.value)}
                        required
                      >
                        <option value="">Select Credit History</option>
                        <option value="No dues">Clean Record / No Past Default (No Dues)</option>
                        <option value="Dues">Active Dues / Irregular Repayments (Dues)</option>
                      </Form.Select>
                      <div className="metric-hint">Institutional credit score benchmark (CIBIL / Experian equivalent)</div>
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {/* Section 3: Optional Agrarian Risk Telemetry */}
              <div className="diagnostic-section mb-4">
                <button
                  type="button"
                  className="agrarian-toggle-btn mb-2"
                  onClick={() => setShowAgrarian(!showAgrarian)}
                  aria-expanded={showAgrarian}
                >
                  <span>🌾 Agrarian Farm Telemetry & Risk Exposure (Optional)</span>
                  <span className="badge bg-secondary">{showAgrarian ? 'Hide ▲' : 'Show & Customize ▼'}</span>
                </button>

                <Collapse in={showAgrarian}>
                  <div className="pt-3">
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Cultivable Land Size (Acres)</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.1"
                            min="0"
                            value={LandSize}
                            onChange={(e) => setLandSize(e.target.value)}
                            placeholder="e.g. 2.0"
                          />
                          <div className="metric-hint">Total owned or leased cultivable farm area</div>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Seasonal Farm Input Cost (₹/Acre)</Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            value={InputCost}
                            onChange={(e) => setInputCost(e.target.value)}
                            placeholder="e.g. 15000"
                          />
                          <div className="metric-hint">Seeds, fertilizer, pesticides, and diesel expenses</div>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Crop Loss Frequency (Last 3 Years)</Form.Label>
                          <Form.Select value={CropLoss} onChange={(e) => setCropLoss(e.target.value)}>
                            <option value="Never">Never (Stable irrigation & climate)</option>
                            <option value="1-2 times">1-2 Times (Occasional drought / flood)</option>
                            <option value="Frequent">Frequent (High climate vulnerability)</option>
                          </Form.Select>
                          <div className="metric-hint">Historical weather hazard frequency</div>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Primary Borrowing Source</Form.Label>
                          <Form.Select value={BorrowSrc} onChange={(e) => setBorrowSrc(e.target.value)}>
                            <option value="Bank">Commercial Bank / Cooperative</option>
                            <option value="Self-financed">Self-Financed / Family</option>
                            <option value="Moneylender">Informal Village Moneylender</option>
                          </Form.Select>
                          <div className="metric-hint">Existing credit servicing channel</div>
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>
                </Collapse>
              </div>

              {/* Submit CTA */}
              <Button
                className="w-100 py-3 fw-bold fs-6 shadow-sm"
                variant="primary"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Analyzing Financial Ratios & Credit Health...
                  </>
                ) : (
                  'Evaluate Loan Eligibility & Financial Advisory →'
                )}
              </Button>
            </Form>

            {/* Legacy Error / Simple Fallback Display */}
            {legacyAns && !resultData && (
              <Card className="mt-4 soft-card">
                <Card.Body>
                  <Card.Title>Prediction Result</Card.Title>
                  <Card.Text className="mb-0">{legacyAns}</Card.Text>
                </Card.Body>
              </Card>
            )}

            {/* Modern Financial Advisory Results Dashboard */}
            {resultData && (
              <div className="loan-result-container" ref={resultRef}>
                {/* Main Verdict Card */}
                <div className={`loan-verdict-card ${resultData.approved ? 'approved' : 'rejected'}`}>
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                    <span className="text-uppercase fw-bold small text-muted">
                      Decision Verdict & Underwriting Status
                    </span>
                    <Badge
                      bg={
                        resultData.risk_level === 'Low Risk'
                          ? 'success'
                          : resultData.risk_level === 'Moderate Risk'
                          ? 'warning'
                          : 'danger'
                      }
                      className="px-3 py-2 fs-7"
                    >
                      {resultData.risk_level || (resultData.approved ? 'Low Risk' : 'High Risk')}
                    </Badge>
                  </div>

                  <div className={`loan-verdict-title ${resultData.approved ? 'approved' : 'rejected'}`}>
                    <span>{resultData.approved ? '✓ Loan Application Approved' : '✕ Loan Application Denied / High Risk'}</span>
                  </div>

                  <p className="text-muted mb-3">
                    {resultData.approved
                      ? 'The applicant demonstrates strong creditworthiness, a healthy debt-to-income ratio, and positive net cash flow.'
                      : 'The requested credit structure exceeds safe borrowing thresholds, or past dues indicate elevated risk. Explore recommended government schemes below.'}
                  </p>

                  {/* Underwriting Probability Meter */}
                  <div className="mb-2">
                    <div className="d-flex justify-content-between small fw-semibold text-secondary mb-1">
                      <span>Approval Probability Score</span>
                      <span>{(resultData.probability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="confidence-bar-container">
                      <div
                        className="confidence-bar-fill"
                        style={{
                          width: `${Math.min(Math.max(resultData.probability * 100, 5), 100)}%`,
                          background: resultData.approved
                            ? 'linear-gradient(90deg, #10b981, #059669)'
                            : 'linear-gradient(90deg, #f59e0b, #ef4444)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Financial Telemetry Grid */}
                  {resultData.financial_capacity && (
                    <div className="loan-telemetry-grid">
                      <div className="loan-metric-tile">
                        <span className="loan-metric-label">Estimated Monthly EMI</span>
                        <span className="loan-metric-value text-primary">
                          ₹{Math.round(resultData.financial_capacity.monthly_emi || 0).toLocaleString()}
                        </span>
                        <span className="loan-metric-sub">
                          Amortized installment for {Loanterm} months
                        </span>
                      </div>

                      <div className="loan-metric-tile">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="loan-metric-label">Debt-to-Income (DTI)</span>
                          {getDtiBadge(resultData.financial_capacity.dti_percentage || 0)}
                        </div>
                        <span className="loan-metric-value">
                          {resultData.financial_capacity.dti_percentage}%
                        </span>
                        <span className="loan-metric-sub">
                          Portion of household income servicing debt
                        </span>
                      </div>

                      <div className="loan-metric-tile">
                        <span className="loan-metric-label">Net Disposable Income</span>
                        <span
                          className={`loan-metric-value ${
                            resultData.financial_capacity.net_balance_income >= 0
                              ? 'text-success'
                              : 'text-danger'
                          }`}
                        >
                          {resultData.financial_capacity.net_balance_income >= 0 ? '+' : ''}
                          ₹{Math.round(resultData.financial_capacity.net_balance_income || 0).toLocaleString()}
                        </span>
                        <span className="loan-metric-sub">
                          Monthly surplus after family & farm expenses
                        </span>
                      </div>

                      <div className="loan-metric-tile">
                        <span className="loan-metric-label">Safe Borrowing Limit</span>
                        <span className="loan-metric-value text-secondary">
                          ₹{Math.round(resultData.financial_capacity.max_recommended_loan || 0).toLocaleString()}
                        </span>
                        <span className="loan-metric-sub">
                          Maximum credit capacity under 35% DTI cap
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Explainability Section: Driving Factors */}
                {resultData.influencing_factors && resultData.influencing_factors.length > 0 && (
                  <div className="mt-4 p-4 bg-white border rounded-3 shadow-sm">
                    <h3 className="h5 fw-bold text-dark mb-3">
                      🔍 Decision Transparency & Driving Factors
                    </h3>
                    <Row className="g-3">
                      {resultData.influencing_factors.map((factor, idx) => (
                        <Col md={6} key={idx}>
                          <div
                            className={`factor-card ${
                              factor.impact === 'Positive'
                                ? 'positive'
                                : factor.impact === 'Neutral'
                                ? 'neutral'
                                : 'negative'
                            }`}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="fw-bold text-dark small">{factor.factor}</span>
                              <Badge
                                bg={
                                  factor.impact === 'Positive'
                                    ? 'success'
                                    : factor.impact === 'Neutral'
                                    ? 'warning'
                                    : 'danger'
                                }
                                text={factor.impact === 'Neutral' ? 'dark' : 'white'}
                              >
                                {factor.impact}
                              </Badge>
                            </div>
                            <p className="text-muted small mb-0">{factor.description}</p>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}

                {/* Alternative Government Schemes Section */}
                {resultData.recommended_schemes && resultData.recommended_schemes.length > 0 && (
                  <div className="mt-4 p-4 bg-light border border-info-subtle rounded-3">
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                      <div>
                        <h3 className="h5 fw-bold text-dark mb-1">
                          🏛️ Recommended Financial Safety Nets & Schemes
                        </h3>
                        <p className="text-muted small mb-0">
                          Subsidized credit programs and crop insurance tailored to support agricultural risk resilience.
                        </p>
                      </div>
                      <Link to="/schemes" className="btn btn-outline-primary btn-sm mt-2 mt-sm-0">
                        Explore All Government Schemes →
                      </Link>
                    </div>

                    <Row className="g-3">
                      {resultData.recommended_schemes.map((scheme, idx) => (
                        <Col lg={4} md={6} key={idx}>
                          <div className="scheme-card-item">
                            <div>
                              <span className="scheme-benefit-badge">{scheme.benefit}</span>
                              <h4 className="h6 fw-bold text-dark mb-2">{scheme.scheme_name}</h4>
                              <p className="text-muted small mb-3">{scheme.description}</p>
                            </div>
                            <div className="pt-2 border-top">
                              <span className="text-secondary small d-block mb-2">
                                <strong>Eligibility:</strong> {scheme.eligibility}
                              </span>
                              <Link
                                to={`/schemes?search=${encodeURIComponent(scheme.scheme_name)}`}
                                className="btn btn-sm btn-primary w-100"
                              >
                                View Scheme Details
                              </Link>
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}

                {/* Recalculate CTA */}
                <div className="text-center mt-4">
                  <Button
                    variant="outline-secondary"
                    className="px-4"
                    onClick={() => {
                      formRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    ↑ Adjust Input Parameters
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Container>
  );
}
