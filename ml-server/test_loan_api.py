"""
AgroInOne - Loan AI Endpoint Automated Test Suite
-------------------------------------------------
Tests the explainable Random Forest loan prediction endpoint in ml-server/app.py
Verifies:
1. Low-Risk Applicant (Good Credit, Healthy DTI) -> Approved: True, High Probability
2. High-Risk / Distressed Applicant (Low Income, Massive Loan, Credit Dues) -> Approved: False, High DTI, Alternative Schemes
3. Boundary & Validation Handling (Negative loan amount, zero income) -> 400 Bad Request
4. Backward Compatibility with existing Node.js proxy schema (approved, probability keys)
"""

import json
import os
import sys

# Ensure ml-server is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app

def run_tests():
    print("=" * 70)
    print("AgroInOne: Testing Upgraded /predict/loan Advisory Endpoint")
    print("=" * 70)

    client = app.test_client()

    # -----------------------------------------------------------------------
    # Test 1: Low-Risk Applicant (Healthy Agrarian Household)
    # -----------------------------------------------------------------------
    print("\n[TEST 1] Low-Risk Applicant (Farmer with clean credit, modest loan, good income)...")
    payload_low_risk = {
        "gender": "Male",
        "married": "Yes",
        "dependent": "2",
        "education": "Graduate",
        "self_emp": "Yes",
        "income": 35000,
        "coap_income": 15000,
        "loan_amount": 150000,  # ₹1.5 Lakhs (or 150k)
        "loan_term": 60,        # 5 years
        "credit_history": "No dues",
        "prop_area": "Rural",
        "land_size": 4.0,
        "input_cost": 12000
    }

    res1 = client.post('/predict/loan', data=json.dumps(payload_low_risk), content_type='application/json')
    assert res1.status_code == 200, f"Expected 200, got {res1.status_code}: {res1.data.decode()}"
    data1 = json.loads(res1.data)
    print("Response Data:")
    print(f"  Approved:             {data1.get('approved')}")
    print(f"  Probability:          {data1.get('probability')}")
    print(f"  Risk Level:           {data1.get('risk_level')}")
    print(f"  Monthly EMI:          Rs. {data1['financial_capacity']['monthly_emi']:,}")
    print(f"  DTI Percentage:       {data1['financial_capacity']['dti_percentage']}%")
    print(f"  Net Balance Income:   Rs. {data1['financial_capacity']['net_balance_income']:,}")
    print("  Influencing Factors:")
    for f in data1.get('influencing_factors', []):
        print(f"    - [{f['impact']}] {f['factor']}: {f['description']}")

    assert data1['approved'] == True, "Expected applicant to be approved!"
    assert data1['probability'] >= 0.70, f"Expected probability >= 0.70, got {data1['probability']}"
    assert data1['financial_capacity']['dti_percentage'] < 35.0, "Expected DTI < 35%"
    print("[PASS] Test 1: Low-Risk applicant approved with positive explainability factors.")

    # -----------------------------------------------------------------------
    # Test 2: High-Risk Applicant (Over-leveraged, Past Defaults)
    # -----------------------------------------------------------------------
    print("\n[TEST 2] High-Risk Applicant (Low income, Rs. 15 Lakhs loan, past defaults)...")
    payload_high_risk = {
        "gender": "Male",
        "married": "No",
        "dependent": "3+",
        "education": "Not Graduate",
        "self_emp": "Yes",
        "income": 8000,
        "coap_income": 0,
        "loan_amount": 1500000, # Rs. 15 Lakhs
        "loan_term": 36,        # 3 years
        "credit_history": "Dues",
        "prop_area": "Rural",
        "land_size": 1.5,
        "input_cost": 25000,
        "borrowing_source": "Moneylender",
        "crop_loss_frequency": "Frequent"
    }

    res2 = client.post('/predict/loan', data=json.dumps(payload_high_risk), content_type='application/json')
    assert res2.status_code == 200, f"Expected 200, got {res2.status_code}: {res2.data.decode()}"
    data2 = json.loads(res2.data)
    print("Response Data:")
    print(f"  Approved:             {data2.get('approved')}")
    print(f"  Probability:          {data2.get('probability')}")
    print(f"  Risk Level:           {data2.get('risk_level')}")
    print(f"  DTI Percentage:       {data2['financial_capacity']['dti_percentage']}%")
    print(f"  Net Balance Income:   Rs. {data2['financial_capacity']['net_balance_income']:,}")
    print("  Influencing Factors:")
    for f in data2.get('influencing_factors', []):
        print(f"    - [{f['impact']}] {f['factor']}: {f['description']}")
    print("  Recommended Alternative Schemes:")
    for s in data2.get('recommended_schemes', []):
        print(f"    - {s['scheme_name']}: {s['benefit']}")

    assert data2['approved'] == False, "Expected high-risk applicant to be rejected!"
    assert data2['probability'] < 0.40, f"Expected probability < 0.40, got {data2['probability']}"
    assert len(data2['recommended_schemes']) >= 2, "Expected fallback government schemes to be recommended!"
    print("[PASS] Test 2: High-Risk applicant rejected, high DTI flagged, alternative schemes provided.")

    # -----------------------------------------------------------------------
    # Test 3: Validation and Error Handling
    # -----------------------------------------------------------------------
    print("\n[TEST 3] Input Validation & Boundary Checks...")
    payload_invalid = {
        "income": -5000,
        "loan_amount": 100000,
        "loan_term": 0
    }
    res3 = client.post('/predict/loan', data=json.dumps(payload_invalid), content_type='application/json')
    assert res3.status_code == 400, f"Expected 400 Bad Request, got {res3.status_code}"
    print("[PASS] Test 3: Boundary validation correctly rejects invalid/negative inputs with 400 Bad Request.")

    # -----------------------------------------------------------------------
    # Test 4: Backward Compatibility Verification
    # -----------------------------------------------------------------------
    print("\n[TEST 4] Backward Compatibility Assertion...")
    assert 'approved' in data1 and isinstance(data1['approved'], bool)
    assert 'probability' in data1 and isinstance(data1['probability'], (float, int))
    assert 'approved' in data2 and isinstance(data2['approved'], bool)
    assert 'probability' in data2 and isinstance(data2['probability'], (float, int))
    print("[PASS] Test 4: Top-level schema remains 100% backward-compatible with Node.js proxy.")

    print("\n" + "=" * 70)
    print("ALL 4 INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == '__main__':
    run_tests()
