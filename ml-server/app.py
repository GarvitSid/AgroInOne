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
    loan_model, loan_encoders = None, None


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
        raw_state   = str(data.get('selected_state',    '')).strip().title()
        raw_district = str(data.get('selected_district', '')).strip().title()
        raw_crop    = str(data.get('selected_crop',     '')).strip().title()
        raw_season  = str(data.get('selected_season',   '')).strip().title()
        year        = int(data.get('crop_year', 2024))
        area        = float(data.get('area', 0) or 0)

        # 2. Safe encoder: fall back to class 0 for unseen labels
        def encode_safe(encoder_name, value):
            try:
                return crop_encoders[encoder_name].transform([value])[0]
            except ValueError:
                return 0

        encoded_data = [[
            encode_safe('State',    raw_state),
            encode_safe('District', raw_district),
            encode_safe('Crop',     raw_crop),
            year,
            encode_safe('Season',   raw_season),
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

        # Safe encoder: fall back to class 0 for unseen labels
        def encode_safe(encoder_name, value):
            try:
                return loan_encoders[encoder_name].transform([value])[0]
            except ValueError:
                return 0

        # 'or 0' guards against empty-string values from React <Form.Control type="number">
        encoded_data = [[
            encode_safe('gender',         data.get('gender',         '')),
            encode_safe('married',        data.get('married',        '')),
            encode_safe('dependent',      str(data.get('dependent',  '0'))),
            encode_safe('education',      data.get('education',      '')),
            encode_safe('self_emp',       data.get('self_emp',       '')),
            float(data.get('income',      0) or 0),
            float(data.get('coap_income', 0) or 0),
            float(data.get('loan_amount', 0) or 0),
            float(data.get('loan_term',   0) or 0),
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
