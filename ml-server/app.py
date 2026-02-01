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
# Health check
# ---------------------------------------------------------------------------
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(port=5001, host='0.0.0.0', debug=True)
