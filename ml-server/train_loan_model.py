import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
import os

# ---------------------------------------------------------------------------
# 1. Generate synthetic historical bank loan data
#    Matches exactly the 11 columns that PredictLoan.jsx sends to the API
# ---------------------------------------------------------------------------
def generate_bank_data(num_records=5000):
    """Creates realistic synthetic loan application records."""
    np.random.seed(42)

    data = {
        'gender':         np.random.choice(['Male', 'Female'], num_records, p=[0.7, 0.3]),
        'married':        np.random.choice(['Yes', 'No'], num_records),
        'dependent':      np.random.choice(['0', '1', '2', '3+'], num_records, p=[0.5, 0.2, 0.2, 0.1]),
        'education':      np.random.choice(['Graduate', 'Not Graduate'], num_records, p=[0.8, 0.2]),
        'self_emp':       np.random.choice(['Yes', 'No'], num_records, p=[0.15, 0.85]),
        # Realistic rupee-scale income and loan amounts (matches testing guidance)
        'income':         np.random.randint(2000, 15000, num_records),
        'coap_income':    np.random.randint(0, 10000, num_records),
        'loan_amount':    np.random.randint(50000, 500000, num_records),
        'loan_term':      np.random.choice([12, 36, 60, 120, 240, 360], num_records),
        'credit_history': np.random.choice(['No dues', 'Dues'], num_records, p=[0.8, 0.2]),
        'prop_area':      np.random.choice(['Urban', 'Semiurban', 'Rural'], num_records),
    }

    df = pd.DataFrame(data)

    # Simulate realistic approval logic for the model to learn from:
    # Higher combined income-to-loan ratio + no credit dues → more likely approved
    approval_score = (
        (df['income'] + df['coap_income']) / df['loan_amount'] * 100
        + (df['credit_history'] == 'No dues') * 50
        - (df['loan_term'] / 12) * 2
    )
    df['approved_status'] = np.where(approval_score > 45, 1, 0)

    return df

print("1. Generating 5,000 synthetic bank loan records...")
df = generate_bank_data()
print(f"   Approval rate: {df['approved_status'].mean():.1%}")

# ---------------------------------------------------------------------------
# 2. Encode categorical columns
# ---------------------------------------------------------------------------
print("2. Encoding categorical variables...")
categorical_cols = ['gender', 'married', 'dependent', 'education', 'self_emp',
                    'credit_history', 'prop_area']
encoders = {}

for col in categorical_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])
    encoders[col] = le
    print(f"   {col}: {list(le.classes_)}")

# ---------------------------------------------------------------------------
# 3. Define features (X) and target (y)
#    Feature order must exactly match the DataFrame created in app.py
# ---------------------------------------------------------------------------
feature_cols = ['gender', 'married', 'dependent', 'education', 'self_emp',
                'income', 'coap_income', 'loan_amount', 'loan_term',
                'credit_history', 'prop_area']
X = df[feature_cols]
y = df['approved_status']

# ---------------------------------------------------------------------------
# 4. Train the Random Forest Classifier
# ---------------------------------------------------------------------------
print("3. Training Random Forest Classifier (n_estimators=100, max_depth=10)...")
model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
model.fit(X, y)
print("   Training complete.")

# ---------------------------------------------------------------------------
# 5. Save model and encoders into models/
# ---------------------------------------------------------------------------
os.makedirs('models', exist_ok=True)
joblib.dump(model,    'models/loan_model_v1.joblib')
joblib.dump(encoders, 'models/loan_encoders.joblib')

print("4. Saved: models/loan_model_v1.joblib")
print("   Saved: models/loan_encoders.joblib")
print("\nSuccess! Loan classification model is ready for production.")
print("Start the server with: python app.py")
