import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { toast } from 'react-toastify';
import { Predictloan } from '../../api/predictloan';
export default function PredictLoan() {
  const [Gender, setGender] = useState('');
  const [Married, setMarried] = useState('');
  const [Dependent, setDependent] = useState('');
  const [Education, setEducation] = useState('');
  const [SelfEmp, setSelfEmp] = useState('');
  const [ApInc, setApInc] = useState('');
  const [CoInc, setCoInc] = useState('');
  const [LoanAmount, setLoanAmount] = useState('');
  const [Loanterm, setLoanterm] = useState('');
  const [Credithistory, setCredithistory] = useState('');
  const [Area, setArea] = useState('');
  const [Ans, setAns] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const newErrors = {};
    if (!Gender) newErrors.Gender = 'Gender is required';
    if (!Married) newErrors.Married = 'Marital status is required';
    if (!Dependent) newErrors.Dependent = 'Dependents field is required';
    if (!Education) newErrors.Education = 'Education is required';
    if (!SelfEmp) newErrors.SelfEmp = 'Self employment status required';
    if (!ApInc || isNaN(ApInc) || ApInc <= 0) newErrors.ApInc = 'Enter a valid positive applicant income';
    if (CoInc === '' || isNaN(CoInc) || CoInc < 0) newErrors.CoInc = 'Enter valid co-applicant income';
    if (!LoanAmount || isNaN(LoanAmount) || LoanAmount <= 0) newErrors.LoanAmount = 'Enter valid loan amount';
    if (!Loanterm || isNaN(Loanterm) || Loanterm <= 0) newErrors.Loanterm = 'Enter valid loan term in months';
    if (!Credithistory) newErrors.Credithistory = 'Credit history required';
    if (!Area) newErrors.Area = 'Property area type required';

    if (Object.keys(newErrors).length > 0) return;

    const ans = {
      gender:         Gender,
      married:        Married,
      dependent:      Dependent,
      education:      Education,
      self_emp:       SelfEmp,
      income:         Number(ApInc),
      coap_income:    Number(CoInc),    // cast to Number (was string before)
      loan_amount:    Number(LoanAmount),
      loan_term:      Number(Loanterm),
      credit_history: Credithistory,
      prop_area:      Area,
    };

    try {
      setLoading(true);
      setAns('');
      const temp = await Predictloan(ans);
      // ML may return { approved: bool, probability: num } or { ans: 1 }
      if (temp && temp.approved !== undefined) {
        const prob = (temp.probability !== undefined) ? Number(temp.probability) : null;
        if (temp.approved) {
          setAns(`✓ Loan has been approved${prob !== null ? ` (probability ${(prob * 100).toFixed(1)}%)` : ''}`);
          toast.success('Loan likely to be approved');
        } else {
          setAns(`✗ Sorry, your loan cannot be approved at this time${prob !== null ? ` (probability ${(prob * 100).toFixed(1)}%)` : ''}`);
          toast.info('Loan is unlikely to be approved');
        }
      } else if (temp && temp.ans === 1) {
        setAns('✓ Loan has been approved');
        toast.success('Loan likely to be approved');
      } else {
        setAns(JSON.stringify(temp));
      }
    } catch (error) {
      setAns('Prediction failed. Please try again.');
      toast.error('Prediction failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

    return (
      <Container className="py-4">
        <h1 className="page-heading text-center">Loan Approval Prediction</h1>
        <div className="row justify-content-center">
          <div className="col-xl-10 col-xxl-9">
            <Card className="form-card p-4 p-md-5">
              <div className="mb-4 text-center">
                <h2 className="mb-2">Applicant details</h2>
                <p className="text-muted mb-0">A balanced two-column layout keeps the loan form much easier to scan.</p>
              </div>

              <Form onSubmit={(e) => { e.preventDefault(); handleClick(); }}>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group className="form-group">
                      <Form.Label>Gender</Form.Label>
                      <Form.Select value={Gender} onChange={(e) => setGender(e.target.value)} required>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="form-group">
                      <Form.Label>Marital Status</Form.Label>
                      <Form.Select value={Married} onChange={(e) => setMarried(e.target.value)} required>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="form-group">
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

                  <Col md={6}>
                    <Form.Group className="form-group">
                      <Form.Label>Education</Form.Label>
                      <Form.Select value={Education} onChange={(e) => setEducation(e.target.value)} required>
                        <option value="">Select</option>
                        <option value="Graduate">Graduate</option>
                        <option value="Not Graduate">Not Graduate</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="form-group">
                      <Form.Label>Self Employed</Form.Label>
                      <Form.Select value={SelfEmp} onChange={(e) => setSelfEmp(e.target.value)} required>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="form-group">
                      <Form.Label>Property Area</Form.Label>
                      <Form.Select value={Area} onChange={(e) => setArea(e.target.value)} required>
                        <option value="">Select</option>
                        <option value="Urban">Urban</option>
                        <option value="Semiurban">Semiurban</option>
                        <option value="Rural">Rural</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="form-group">
                      <Form.Label>Applicant Income</Form.Label>
                      <Form.Control type="number" min="0" value={ApInc} onChange={(e) => setApInc(e.target.value)} placeholder="Applicant income" required />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="form-group">
                      <Form.Label>Co-applicant Income</Form.Label>
                      <Form.Control type="number" min="0" value={CoInc} onChange={(e) => setCoInc(e.target.value)} placeholder="Co-applicant income" required />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="form-group">
                      <Form.Label>Loan Amount</Form.Label>
                      <Form.Control type="number" min="0" value={LoanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="Loan amount" required />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="form-group">
                      <Form.Label>Loan Term (months)</Form.Label>
                      <Form.Control type="number" min="0" value={Loanterm} onChange={(e) => setLoanterm(e.target.value)} placeholder="Loan term" required />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="form-group">
                      <Form.Label>Credit History</Form.Label>
                      <Form.Select value={Credithistory} onChange={(e) => setCredithistory(e.target.value)} required>
                        <option value="">Select</option>
                        <option value="No dues">No dues</option>
                        <option value="Dues">Dues</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Button className="mt-4 w-100" variant="primary" type="submit" disabled={loading}>
                  {loading ? <><Spinner animation="border" size="sm" className="me-2" />Predicting...</> : 'Check Loan Eligibility'}
                </Button>
              </Form>

              {Ans && (
                <Card className="mt-4 soft-card">
                  <Card.Body>
                    <Card.Title>Loan Prediction</Card.Title>
                    <Card.Text className="mb-0">{Ans}</Card.Text>
                  </Card.Body>
                </Card>
              )}
            </Card>
          </div>
        </div>
      </Container>
    );
}
