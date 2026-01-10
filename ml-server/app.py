from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import joblib
import pandas as pd

app = Flask(__name__)
CORS(app)

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

# ---------------------------------------------------------------------------
# Load Crop model (Random Forest Regressor)
# ---------------------------------------------------------------------------
try:
    crop_model = joblib.load(os.path.join(MODEL_DIR, 'crop_model_v1.joblib'))
    crop_encoders = joblib.load(os.path.join(MODEL_DIR, 'crop_encoders.joblib'))
    print("Crop AI model loaded successfully.")
except Exception as e:
    print("Warning: Crop models not found. Run train_crop_model.py first.", e)
    crop_model, crop_encoders = None, None

# ---------------------------------------------------------------------------
# Load Loan model (Random Forest Classifier)
# ---------------------------------------------------------------------------
try:
    loan_model = joblib.load(os.path.join(MODEL_DIR, 'loan_model_v1.joblib'))
    loan_encoders = joblib.load(os.path.join(MODEL_DIR, 'loan_encoders.joblib'))
    print("Loan AI model loaded successfully.")
except Exception as e:
    print("Warning: Loan models not found. Run train_loan_model.py first.", e)
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
# /predict/recommend — Random Forest Classifier (Model 1)
# ---------------------------------------------------------------------------
@app.route('/predict/recommend', methods=['POST'])
def predict_recommend():
    if crop_recommender is None:
        return jsonify({'error': 'Crop recommender model not initialized on server'}), 500

    try:
        data = request.get_json() or {}

        def parse_float(key, aliases=[]):
            val = data.get(key)
            if val is None:
                for a in aliases:
                    if a in data:
                        val = data[a]
                        break
            if val is None or str(val).strip() == '':
                raise ValueError(f"Missing required parameter '{key}'.")
            try:
                return float(val)
            except (ValueError, TypeError):
                raise ValueError(f"Parameter '{key}' must be a valid numeric value.")

        n = parse_float('N', ['nitrogen', 'n'])
        p = parse_float('P', ['phosphorus', 'p'])
        k = parse_float('K', ['potassium', 'k'])
        temp = parse_float('temperature', ['temp'])
        humidity = parse_float('humidity')
        ph = parse_float('ph', ['pH'])
        rainfall = parse_float('rainfall', ['rain'])

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
# /predict/crop  —  Random Forest Regressor
# ---------------------------------------------------------------------------
@app.route('/predict/crop', methods=['POST'])
def predict_crop():
    if crop_model is None or crop_encoders is None:
        return jsonify({'error': 'Model not initialized on server'}), 500

    try:
        data = request.get_json() or {}

        # 1. Extract and sanitize: .strip().title() matches the clean_data.py format
        raw_state    = str(data.get('selected_state',    '')).strip().title()
        raw_district = str(data.get('selected_district', '')).strip().title()
        raw_crop     = str(data.get('selected_crop',     '')).strip().title()
        raw_season   = str(data.get('selected_season',   '')).strip().title()
        year         = int(data.get('crop_year', 2024))
        area         = float(data.get('area', 0) or 0)

        # Validation: Area must be positive
        if area <= 0:
            return jsonify({'error': 'Area must be a positive number greater than 0.'}), 400

        # 2. Strict encoder: reject unseen categories with 400 Bad Request
        def encode_strict(encoder_name, value):
            encoder = crop_encoders.get(encoder_name)
            if encoder is None or value not in encoder.classes_:
                return None
            return encoder.transform([value])[0]

        encoded_state    = encode_strict('State', raw_state)
        encoded_district = encode_strict('District', raw_district)
        encoded_crop     = encode_strict('Crop', raw_crop)
        encoded_season   = encode_strict('Season', raw_season)

        missing = []
        if encoded_state is None:    missing.append(f"State '{raw_state}'")
        if encoded_district is None: missing.append(f"District '{raw_district}'")
        if encoded_crop is None:     missing.append(f"Crop '{raw_crop}'")
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

        # 3. DataFrame must match training feature names exactly
        input_df = pd.DataFrame(
            encoded_data,
            columns=['State', 'District', 'Crop', 'Year', 'Season', 'Area']
        )

        # 4. Predict Production (Tonnes), then derive true Yield (Tonnes/Hectare)
        predicted_production = crop_model.predict(input_df)[0]
        predicted_yield = (predicted_production / area) if area > 0 else 0

        return jsonify({
            'answer':     round(predicted_yield, 2),      # Yield = Production / Area
            'production': round(predicted_production, 2), # Raw Production in Tonnes
        })

    except Exception as e:
        print("Crop Prediction Error:", str(e))
        return jsonify({'error': str(e)}), 400


# ---------------------------------------------------------------------------
# /predict/loan  —  Random Forest Classifier
# ---------------------------------------------------------------------------
@app.route('/predict/loan', methods=['POST'])
def predict_loan():
    if loan_model is None or loan_encoders is None:
        return jsonify({'error': 'Loan model not initialized on server'}), 500

    try:
        data = request.get_json() or {}

        # Validate positive numeric inputs
        income      = float(data.get('income', 0) or 0)
        coap_income = float(data.get('coap_income', 0) or 0)
        loan_amount = float(data.get('loan_amount', 0) or 0)
        loan_term   = float(data.get('loan_term', 0) or 0)

        if loan_amount <= 0 or loan_term <= 0 or income <= 0:
            return jsonify({'error': 'Income, loan amount, and loan term must be positive numbers.'}), 400

        # Safe encoder: fall back to class 0 for unseen labels
        def encode_safe(encoder_name, value):
            try:
                return loan_encoders[encoder_name].transform([value])[0]
            except ValueError:
                return 0

        encoded_data = [[
            encode_safe('gender',         data.get('gender',         '')),
            encode_safe('married',        data.get('married',        '')),
            encode_safe('dependent',      str(data.get('dependent',  '0'))),
            encode_safe('education',      data.get('education',      '')),
            encode_safe('self_emp',       data.get('self_emp',       '')),
            income,
            coap_income,
            loan_amount,
            loan_term,
            encode_safe('credit_history', data.get('credit_history', '')),
            encode_safe('prop_area',      data.get('prop_area',      '')),
        ]]

        # DataFrame columns must match training feature order exactly
        cols = [
            'gender', 'married', 'dependent', 'education', 'self_emp',
            'income', 'coap_income', 'loan_amount', 'loan_term',
            'credit_history', 'prop_area',
        ]
        input_df = pd.DataFrame(encoded_data, columns=cols)

        # Predict class (1 = Approved, 0 = Denied) and approval probability
        prediction    = loan_model.predict(input_df)[0]
        probabilities = loan_model.predict_proba(input_df)[0]
        approval_prob = probabilities[1]  # index 1 = probability of approval

        return jsonify({
            'approved':    bool(prediction == 1),
            'probability': float(approval_prob),
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
