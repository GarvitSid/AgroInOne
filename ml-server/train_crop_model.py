import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib
import os

# ---------------------------------------------------------------------------
# 1. Load the cleaned dataset (output of clean_data.py)
# ---------------------------------------------------------------------------
try:
    df = pd.read_csv('crop_data.csv')
except FileNotFoundError:
    print("Error: 'crop_data.csv' not found. Run clean_data.py first.")
    raise

print(f"Loaded {len(df)} rows from crop_data.csv")

# ---------------------------------------------------------------------------
# 2. Encode categorical columns (text → integer labels the model understands)
# ---------------------------------------------------------------------------
encoders = {
    'State':    LabelEncoder(),
    'District': LabelEncoder(),
    'Crop':     LabelEncoder(),
    'Season':   LabelEncoder(),
}

df['State']    = encoders['State'].fit_transform(df['State'])
df['District'] = encoders['District'].fit_transform(df['District'])
df['Crop']     = encoders['Crop'].fit_transform(df['Crop'])
df['Season']   = encoders['Season'].fit_transform(df['Season'])

# ---------------------------------------------------------------------------
# 3. Define features (X) and target (y)
#    Feature order must exactly match the DataFrame created in app.py
# ---------------------------------------------------------------------------
X = df[['State', 'District', 'Crop', 'Year', 'Season', 'Area']]
y = df['Production']

# ---------------------------------------------------------------------------
# 4. Train the Random Forest Regressor
# ---------------------------------------------------------------------------
print("Training Random Forest Regressor (n_estimators=100)...")
# We lower estimators to 30, and restrict max_depth to 12. 
# This stops the model from growing to 2GB and keeps it lightweight.
model = RandomForestRegressor(
    n_estimators=30, 
    max_depth=12, 
    min_samples_leaf=5, 
    random_state=42, 
    n_jobs=-1
)
model.fit(X, y)
print("Training complete.")

# ---------------------------------------------------------------------------
# 5. Save model and encoders into models/
# ---------------------------------------------------------------------------
os.makedirs('models', exist_ok=True)
joblib.dump(model,    'models/crop_model_v1.joblib')
joblib.dump(encoders, 'models/crop_encoders.joblib')

print("Saved: models/crop_model_v1.joblib")
print("Saved: models/crop_encoders.joblib")
print("\nCrop model is ready. Start the server with: python app.py")
