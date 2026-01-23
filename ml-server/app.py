from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import joblib
import numpy as np
import pandas as pd

app = Flask(__name__)
CORS(app)

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

# ---------------------------------------------------------------------------
# Load Crop Yield Forecaster (Random Forest Regressor - Model 2)
# ---------------------------------------------------------------------------
try:
    crop_model = joblib.load(os.path.join(MODEL_DIR, 'crop_model_v1.joblib'))
    crop_encoders = joblib.load(os.path.join(MODEL_DIR, 'crop_encoders.joblib'))
    print("Crop Yield Forecaster model loaded successfully.")
except Exception as e:
    print("Warning: Crop models not found. Run train_crop_model.py first.", e)
    crop_model, crop_encoders = None, None

# ---------------------------------------------------------------------------
# Load Loan model (Tuned Random Forest Classifier + Feature Importances)
# ---------------------------------------------------------------------------
loan_feature_importances = {}
loan_metadata = {}
try:
    rf_model_path = os.path.join(MODEL_DIR, 'loan_model_rf.joblib')
    legacy_model_path = os.path.join(MODEL_DIR, 'loan_model_v1.joblib')
    chosen_path = rf_model_path if os.path.exists(rf_model_path) else legacy_model_path

    loan_model = joblib.load(chosen_path)
    loan_encoders = joblib.load(os.path.join(MODEL_DIR, 'loan_encoders.joblib'))

    fi_path = os.path.join(MODEL_DIR, 'loan_feature_importances.json')
    if os.path.exists(fi_path):
        with open(fi_path, 'r') as f:
            loan_feature_importances = json.load(f)

    meta_path = os.path.join(MODEL_DIR, 'loan_model_metadata.json')
    if os.path.exists(meta_path):
        with open(meta_path, 'r') as f:
            loan_metadata = json.load(f)

    print("Loan AI (Random Forest) model and explainability assets loaded successfully.")
except Exception as e:
    print("Warning: Loan models not found. Run train_loan_model.py first.", e)
    loan_model, loan_encoders = None, None

# ---------------------------------------------------------------------------
# Load Crop Recommender (Random Forest Classifier - Model 1)
# ---------------------------------------------------------------------------
try:
    crop_recommender = joblib.load(os.path.join(MODEL_DIR, 'crop_recommender_v1.joblib'))
    crop_recommender_meta = joblib.load(os.path.join(MODEL_DIR, 'crop_recommender_meta.joblib'))
    print("Crop Recommender model loaded successfully.")
except Exception as e:
    print("Warning: Crop recommender model not found. Run train_crop_recommender.py first.", e)
    crop_recommender, crop_recommender_meta = None, None

# ---------------------------------------------------------------------------
# Canonical Crop Mapping: Model 1 (Recommender) -> Model 2 (Forecaster)
# ---------------------------------------------------------------------------
CROP_CANONICAL_MAPPING = {
    'Cotton': 'Cotton(Lint)',
    'Chickpea': 'Gram',
    'Pomegranate': 'Pome Granet',
    'Watermelon': 'Water Melon',
    'Mungbean': 'Moong(Green Gram)',
    'Pigeonpeas': 'Arhar/Tur',
    'Kidneybeans': 'Beans & Mutter(Vegetable)',
    'Mothbeans': 'Other Cereals & Millets',
    'Muskmelon': 'Water Melon',
}


def _extract_metric(norm_dict, name, *aliases):
    all_keys = [name.lower()] + [a.lower() for a in aliases]
    for k in all_keys:
        if k in norm_dict and norm_dict[k] is not None and str(norm_dict[k]).strip() != '':
            try:
                return float(norm_dict[k])
            except (ValueError, TypeError):
                raise ValueError(f"Parameter '{name}' must be a valid numeric value.")
    raise ValueError(f"Missing required parameter '{name}'.")


# ---------------------------------------------------------------------------
# /predict/recommend — Random Forest Classifier (Model 1 Isolated Endpoint)
# ---------------------------------------------------------------------------
@app.route('/predict/recommend', methods=['POST'])
def predict_recommend():
    if crop_recommender is None:
        return jsonify({'error': 'Crop recommender model not initialized on server'}), 500

    try:
        raw_data = request.get_json() or {}
        norm_data = {str(k).lower(): v for k, v in raw_data.items()}

        n = _extract_metric(norm_data, 'N', 'nitrogen')
        p = _extract_metric(norm_data, 'P', 'phosphorus')
        k = _extract_metric(norm_data, 'K', 'potassium')
        temp = _extract_metric(norm_data, 'temperature', 'temp')
        humidity = _extract_metric(norm_data, 'humidity')
        ph = _extract_metric(norm_data, 'ph')
        rainfall = _extract_metric(norm_data, 'rainfall', 'rain')

        # Boundary checks
        if n < 0 or p < 0 or k < 0:
            return jsonify({'error': 'Nutrient metrics (N, P, K) must be non-negative.'}), 400
        if not (0.0 <= ph <= 14.0):
            return jsonify({'error': 'Soil pH must be between 0.0 and 14.0.'}), 400
        if humidity < 0 or humidity > 100:
            return jsonify({'error': 'Relative humidity must be between 0% and 100%.'}), 400
        if rainfall < 0:
            return jsonify({'error': 'Rainfall must be a non-negative number.'}), 400

        input_df = pd.DataFrame([[n, p, k, temp, humidity, ph, rainfall]],
                                columns=['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall'])

        predicted_crop = crop_recommender.predict(input_df)[0]
        proba = crop_recommender.predict_proba(input_df)[0]
        max_idx = crop_recommender.classes_.tolist().index(predicted_crop)
        confidence = round(float(proba[max_idx]), 4)

        return jsonify({
            'recommended_crop': str(predicted_crop),
            'confidence': confidence,
            'input_metrics': {
                'N': n,
                'P': p,
                'K': k,
                'temperature': temp,
                'humidity': humidity,
                'ph': ph,
                'rainfall': rainfall
            }
        })

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        print("Crop Recommendation Error:", str(e))
        return jsonify({'error': f"Failed to compute crop recommendation: {str(e)}"}), 500


# ---------------------------------------------------------------------------
# /predict/crop — Chained Two-Stage Pipeline (Model 1 Classifier -> Model 2 Regressor)
# ---------------------------------------------------------------------------
@app.route('/predict/crop', methods=['POST'])
def predict_crop():
    if crop_model is None or crop_encoders is None:
        return jsonify({'error': 'Crop yield forecaster model not initialized on server'}), 500

    try:
        raw_data = request.get_json() or {}
        norm_data = {str(k).lower(): v for k, v in raw_data.items()}

        def get_text(*keys):
            for k in keys:
                lk = k.lower()
                if lk in norm_data and norm_data[lk] is not None and str(norm_data[lk]).strip() != '':
                    return str(norm_data[lk]).strip()
            return ''

        # 1. Parse and validate logistics
        raw_state    = get_text('selected_state', 'state').title()
        raw_district = get_text('selected_district', 'district').title()
        raw_season   = get_text('selected_season', 'season').title()

        year_str = get_text('crop_year', 'year')
        year = int(year_str) if year_str else 2024

        area_str = get_text('area')
        try:
            area = float(area_str) if area_str else 0.0
        except ValueError:
            return jsonify({'error': 'Area must be a valid positive number.'}), 400

        # Validation: Area must be positive
        if area <= 0:
            return jsonify({'error': 'Area must be a positive number greater than 0.'}), 400

        # 2. Check if soil & climate telemetry are provided (Stage 1 Recommender)
        has_soil_metrics = any(k in norm_data for k in ['n', 'nitrogen']) and \
                           any(k in norm_data for k in ['rainfall', 'rain'])

        recommended_crop = None
        confidence = None

        if has_soil_metrics:
            if crop_recommender is None:
                return jsonify({'error': 'Crop recommender model not initialized on server'}), 500

            n = _extract_metric(norm_data, 'N', 'nitrogen')
            p = _extract_metric(norm_data, 'P', 'phosphorus')
            k = _extract_metric(norm_data, 'K', 'potassium')
            temp = _extract_metric(norm_data, 'temperature', 'temp')
            humidity = _extract_metric(norm_data, 'humidity')
            ph = _extract_metric(norm_data, 'ph')
            rainfall = _extract_metric(norm_data, 'rainfall', 'rain')

            # Soil chemistry and climate boundary checks
            if n < 0 or p < 0 or k < 0:
                return jsonify({'error': 'Nutrient metrics (N, P, K) must be non-negative.'}), 400
            if not (0.0 <= ph <= 14.0):
                return jsonify({'error': 'Soil pH must be between 0.0 and 14.0.'}), 400
            if humidity < 0 or humidity > 100:
                return jsonify({'error': 'Relative humidity must be between 0% and 100%.'}), 400
            if rainfall < 0:
                return jsonify({'error': 'Rainfall must be a non-negative number.'}), 400

            # Execute Stage 1: Crop Recommender (Model 1 Classifier)
            rec_df = pd.DataFrame([[n, p, k, temp, humidity, ph, rainfall]],
                                  columns=['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall'])
            recommended_crop = str(crop_recommender.predict(rec_df)[0])
            proba = crop_recommender.predict_proba(rec_df)[0]
            max_idx = crop_recommender.classes_.tolist().index(recommended_crop)
            confidence = round(float(proba[max_idx]), 4)

            # Use recommended crop as target crop for Stage 2
            raw_crop = recommended_crop
        else:
            # Fallback for manual crop selection (legacy compatibility)
            raw_crop = get_text('selected_crop', 'crop').title()
            if not raw_crop:
                return jsonify({'error': 'Either soil/climate metrics or selected_crop must be provided.'}), 400
            recommended_crop = raw_crop

        # 3. Canonical Crop Name Resolution for Stage 2
        forecaster_crop = CROP_CANONICAL_MAPPING.get(raw_crop, raw_crop)

        # 4. Strict encoder for Model 2 (Yield Forecaster Regressor)
        def encode_strict(encoder_name, value):
            encoder = crop_encoders.get(encoder_name)
            if encoder is None or value not in encoder.classes_:
                return None
            return encoder.transform([value])[0]

        encoded_state    = encode_strict('State', raw_state)
        encoded_district = encode_strict('District', raw_district)
        encoded_crop     = encode_strict('Crop', forecaster_crop)
        encoded_season   = encode_strict('Season', raw_season)

        missing = []
        if encoded_state is None:    missing.append(f"State '{raw_state}'")
        if encoded_district is None: missing.append(f"District '{raw_district}'")
        if encoded_crop is None:     missing.append(f"Crop '{forecaster_crop}'")
        if encoded_season is None:   missing.append(f"Season '{raw_season}'")

        if missing:
            return jsonify({
                'error': f"Unsupported options: {', '.join(missing)}. Please select valid options from the provided lists."
            }), 400

        encoded_data = [[
            encoded_state,
            encoded_district,
            encoded_crop,
            year,
            encoded_season,
            area,
        ]]

        input_df = pd.DataFrame(
            encoded_data,
            columns=['State', 'District', 'Crop', 'Year', 'Season', 'Area']
        )

        # 5. Execute Stage 2: Predict Production (Tonnes) and derive Yield (Tonnes/Hectare)
        predicted_production = float(crop_model.predict(input_df)[0])
        predicted_yield = (predicted_production / area) if area > 0 else 0.0

        response_data = {
            'recommended_crop': recommended_crop,
            'yield_tonnes_per_hectare': round(predicted_yield, 2),
            'production_tonnes': round(predicted_production, 2),
            'answer': round(predicted_yield, 2),       # Backward compatibility
            'production': round(predicted_production, 2) # Backward compatibility
        }

        if confidence is not None:
            response_data['confidence'] = confidence

        if has_soil_metrics:
            response_data['input_metrics'] = {
                'N': n,
                'P': p,
                'K': k,
                'temperature': temp,
                'humidity': humidity,
                'ph': ph,
                'rainfall': rainfall,
                'state': raw_state,
                'district': raw_district,
                'season': raw_season,
                'year': year,
                'area': area
            }

        return jsonify(response_data)

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        print("Crop Pipeline Error:", str(e))
        return jsonify({'error': str(e)}), 400


# ---------------------------------------------------------------------------
# /predict/loan — Explainable Random Forest Credit Advisory Endpoint
# ---------------------------------------------------------------------------
@app.route('/predict/loan', methods=['POST'])
def predict_loan():
    if loan_model is None or loan_encoders is None:
        return jsonify({'error': 'Loan model not initialized on server'}), 500

    try:
        raw_data = request.get_json() or {}
        # Case-insensitive / normalize keys
        data = {str(k).lower(): v for k, v in raw_data.items()}

        def get_val(*keys, default=''):
            for k in keys:
                lk = k.lower()
                if lk in data and data[lk] is not None and str(data[lk]).strip() != '':
                    return data[lk]
            return default

        # 1. Parse and validate financials
        try:
            income = float(get_val('income', 'applicant_income', 'applicantincome', default=0))
            coap_income = float(get_val('coap_income', 'coapplicant_income', 'coapplicantincome', default=0))
            raw_loan = float(get_val('loan_amount', 'loanamount', default=0))
            loan_term = float(get_val('loan_term', 'loan_amount_term', 'term', default=36))
        except (ValueError, TypeError):
            return jsonify({'error': 'Income, loan amount, and loan term must be valid numbers.'}), 400

        if raw_loan <= 0 or loan_term <= 0 or income <= 0:
            return jsonify({'error': 'Income, loan amount, and loan term must be positive numbers.'}), 400

        # Scale loan amount: if passed in full Rupees (e.g. >= 5000), convert to Thousands of INR (as used in model)
        loan_amount_k = (raw_loan / 1000.0) if raw_loan >= 5000 else raw_loan
        actual_loan_inr = loan_amount_k * 1000.0

        # Optional agrarian inputs with realistic defaults
        try:
            land_size = float(get_val('land_size', 'land_size_acres', 'landsize', default=2.5))
            input_cost = float(get_val('input_cost', 'input_cost_per_acre', 'inputcost', default=15000))
        except (ValueError, TypeError):
            land_size = 2.5
            input_cost = 15000.0

        crop_loss_freq = str(get_val('crop_loss_frequency', 'crop_loss', default='1-2 times')).strip()
        borrow_src = str(get_val('borrowing_source', 'borrow_source', default='Self-financed')).strip()

        # Parse credit history (supports 'No dues'/'Dues', '1'/'0', 'Good'/'Irregular', booleans)
        raw_credit = str(get_val('credit_history', 'credithistory', default='1')).strip().lower()
        if raw_credit in ['no dues', 'nodues', '1', '1.0', 'true', 'yes', 'good']:
            credit_history = 1.0
            credit_str = 'Clean (No dues)'
        else:
            credit_history = 0.0
            credit_str = 'Dues / Default history'

        # 2. Financial Feature Engineering
        total_income = max(1.0, income + coap_income)
        monthly_emi = round((loan_amount_k * 1000.0) / loan_term, 2)
        dti_ratio = round(monthly_emi / total_income, 4)
        monthly_farm_expense = round((land_size * input_cost) / 12.0, 2)
        net_balance_income = round(total_income - monthly_emi - monthly_farm_expense, 2)
        loan_amount_log = round(float(np.log(max(1.0, loan_amount_k))), 4)
        total_income_log = round(float(np.log(max(1.0, total_income))), 4)

        # 3. Safe Encoding
        def encode_safe(col_name, val):
            if col_name in loan_encoders:
                le = loan_encoders[col_name]
                s_val = str(val).strip()
                # Check exact or case-insensitive match
                for cls in le.classes_:
                    if str(cls).lower() == s_val.lower():
                        return le.transform([cls])[0]
                return 0
            return 0

        gender = str(get_val('gender', default='Male')).capitalize()
        married = str(get_val('married', default='Yes')).capitalize()
        dependent = str(get_val('dependent', 'dependents', default='0')).strip()
        education = str(get_val('education', default='Graduate')).capitalize()
        self_emp = 'Yes' if str(get_val('self_emp', 'self_employed', default='Yes')).lower() in ['yes', 'y', 'true', '1'] else 'No'
        prop_area = str(get_val('prop_area', 'property_area', default='Rural')).capitalize()

        feature_row = [
            # Categorical (8)
            encode_safe('Gender', gender),
            encode_safe('Married', married),
            encode_safe('Dependents', dependent),
            encode_safe('Education', education),
            encode_safe('Self_Employed', self_emp),
            encode_safe('Property_Area', prop_area),
            encode_safe('Crop_Loss_Frequency', crop_loss_freq),
            encode_safe('Borrowing_Source', borrow_src),
            # Numeric (13)
            income,
            coap_income,
            total_income,
            loan_amount_k,
            loan_term,
            credit_history,
            land_size,
            input_cost,
            monthly_emi,
            dti_ratio,
            net_balance_income,
            loan_amount_log,
            total_income_log
        ]

        feature_cols = [
            'Gender', 'Married', 'Dependents', 'Education', 'Self_Employed',
            'Property_Area', 'Crop_Loss_Frequency', 'Borrowing_Source',
            'ApplicantIncome', 'CoapplicantIncome', 'Total_Income',
            'LoanAmount', 'Loan_Amount_Term', 'Credit_History',
            'Land_Size_Acres', 'Input_Cost_per_Acre', 'Monthly_EMI',
            'Debt_to_Income_Ratio', 'Net_Balance_Income',
            'LoanAmount_log', 'Total_Income_log'
        ]

        input_df = pd.DataFrame([feature_row], columns=feature_cols)

        # 4. Predict using Random Forest
        prediction = int(loan_model.predict(input_df)[0])
        probabilities = loan_model.predict_proba(input_df)[0]
        approval_prob = round(float(probabilities[1]), 4)
        is_approved = bool(prediction == 1)

        # 5. Risk Assessment & Decision Insights
        if approval_prob >= 0.70:
            risk_level = "Low Risk"
        elif approval_prob >= 0.45:
            risk_level = "Moderate Risk"
        else:
            risk_level = "High Risk"

        # Calculate max recommended loan capacity (35% safe DTI ceiling)
        safe_monthly_emi = total_income * 0.35
        max_recommended_loan = round(safe_monthly_emi * loan_term, 2)

        # 6. Extract Top Influencing Factors
        influencing_factors = []

        # Credit History Driver
        if credit_history == 1.0:
            influencing_factors.append({
                "factor": "Credit Repayment History",
                "impact": "Positive",
                "description": "Clean historical repayment record with no active credit dues or past defaults."
            })
        else:
            influencing_factors.append({
                "factor": "Credit Repayment History",
                "impact": "Negative",
                "description": "Historical dues or irregular repayments significantly depress the credit profile."
            })

        # DTI Driver
        dti_pct = round(dti_ratio * 100, 1)
        if dti_ratio <= 0.35:
            influencing_factors.append({
                "factor": "Debt-to-Income Ratio (DTI)",
                "impact": "Positive",
                "description": f"Healthy DTI of {dti_pct}% is comfortably within the safe 35% banking threshold."
            })
        elif dti_ratio <= 0.50:
            influencing_factors.append({
                "factor": "Debt-to-Income Ratio (DTI)",
                "impact": "Neutral",
                "description": f"Moderate DTI of {dti_pct}%. Repayment is manageable but leaves limited safety buffer."
            })
        else:
            influencing_factors.append({
                "factor": "Debt-to-Income Ratio (DTI)",
                "impact": "Negative",
                "description": f"High debt burden: EMI consumes {dti_pct}% of total household income (safe ceiling: 35%)."
            })

        # Repayment Capacity / Net Balance Surplus
        if net_balance_income > 2500:
            influencing_factors.append({
                "factor": "Agrarian Repayment Capacity",
                "impact": "Positive",
                "description": f"Positive monthly disposable surplus of Rs. {int(net_balance_income):,} after farm input costs and EMI."
            })
        elif net_balance_income > 0:
            influencing_factors.append({
                "factor": "Agrarian Repayment Capacity",
                "impact": "Neutral",
                "description": f"Tight monthly cash flow buffer (Rs. {int(net_balance_income):,}/month surplus)."
            })
        else:
            influencing_factors.append({
                "factor": "Agrarian Repayment Capacity",
                "impact": "Negative",
                "description": f"Cash flow deficit: Estimated farm input expenses and EMI exceed monthly family income."
            })

        # Co-applicant Cushion
        if coap_income > 0:
            influencing_factors.append({
                "factor": "Co-Applicant Support",
                "impact": "Positive",
                "description": f"Secondary income of Rs. {int(coap_income):,}/month substantially strengthens repayment stability."
            })

        # 7. Alternative Government Schemes (if High/Moderate Risk or Denied)
        recommended_schemes = []
        if not is_approved or approval_prob < 0.65:
            recommended_schemes = [
                {
                    "scheme_name": "Kisan Credit Card (KCC)",
                    "benefit": "4% Subsidized Interest Rate",
                    "description": "Government interest subvention scheme providing affordable working capital and crop maintenance credit.",
                    "eligibility": "All owner cultivators, tenant farmers, and Self Help Groups."
                },
                {
                    "scheme_name": "PM MUDRA Yojana (PMMY - Shishu / Kishore)",
                    "benefit": "Collateral-Free Micro Credit up to Rs. 5 Lakhs",
                    "description": "Provides formal institutional credit for farm-allied activities (dairy, poultry, grading, storage) with zero collateral.",
                    "eligibility": "Rural micro-enterprises and farming allied entrepreneurs."
                },
                {
                    "scheme_name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
                    "benefit": "Comprehensive Crop Failure Insurance",
                    "description": "Protects farmers against non-preventable climate and harvest disasters, preventing debt traps and loan defaults.",
                    "eligibility": "All farmers growing notified crops in notified areas."
                }
            ]

        # 8. Return Comprehensive JSON Response
        return jsonify({
            # Top-level backward compatibility keys
            'approved': is_approved,
            'probability': approval_prob,
            # Enhanced advisory metadata
            'risk_level': risk_level,
            'credit_summary': credit_str,
            'financial_capacity': {
                'monthly_emi': monthly_emi,
                'total_income': total_income,
                'dti_ratio': dti_ratio,
                'dti_percentage': dti_pct,
                'monthly_farm_expense': monthly_farm_expense,
                'net_balance_income': net_balance_income,
                'actual_loan_inr': actual_loan_inr,
                'max_recommended_loan': max_recommended_loan
            },
            'influencing_factors': influencing_factors[:4],
            'recommended_schemes': recommended_schemes
        })

    except Exception as e:
        print("Loan Prediction Error:", str(e))
        return jsonify({'error': str(e)}), 400


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(port=5001, host='0.0.0.0', debug=True)
