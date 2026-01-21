"""
AgroInOne - Random Forest Loan Classification Model Training & Tuning
---------------------------------------------------------------------
Trains, optimizes, and serializes the production Random Forest Classifier
using the unified agrarian and banking master dataset: ml-server/data/agro_loan_master.csv

Key Features Used:
- Demographics: Gender, Married, Dependents, Education, Self_Employed, Property_Area
- Financials: ApplicantIncome, CoapplicantIncome, Total_Income, LoanAmount, Loan_Amount_Term
- Financial Engineering: Monthly_EMI, Debt_to_Income_Ratio, Net_Balance_Income, Total_Income_log, LoanAmount_log
- Agrarian Risk: Land_Size_Acres, Input_Cost_per_Acre, Crop_Loss_Frequency, Borrowing_Source, Monthly_Farm_Expense

Outputs Saved to ml-server/models/:
- loan_model_rf.joblib            (Best tuned RandomForestClassifier)
- loan_encoders.joblib            (LabelEncoders for categorical inputs)
- loan_feature_importances.json   (Sorted feature weights for explainability UI)
- loan_model_metadata.json        (Evaluation metrics, training stats, schema)
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "agro_loan_master.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def train_and_tune_model():
    print("=" * 70)
    print("AgroInOne: Training & Tuning Random Forest Loan Model")
    print("=" * 70)

    # 1. Load Master Dataset
    print(f"1. Loading unified dataset from {DATA_PATH}...")
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Missing master dataset at {DATA_PATH}. Run clean_and_merge_loan_data.py first.")

    df = pd.read_csv(DATA_PATH)
    print(f"   Loaded {len(df):,} records with {df.shape[1]} columns.")
    print(f"   Target distribution: Y={df['Loan_Status'].value_counts().get('Y', 0)} ({(df['Loan_Status'] == 'Y').mean():.1%}), N={df['Loan_Status'].value_counts().get('N', 0)} ({(df['Loan_Status'] == 'N').mean():.1%})")

    # 2. Select Features for Training
    # We maintain 100% backward compatibility with PredictLoan.jsx's 11 inputs
    # while leveraging the engineered financial ratios for maximum predictive power
    categorical_features = [
        'Gender', 'Married', 'Dependents', 'Education', 'Self_Employed',
        'Property_Area', 'Crop_Loss_Frequency', 'Borrowing_Source'
    ]

    numeric_features = [
        'ApplicantIncome', 'CoapplicantIncome', 'Total_Income',
        'LoanAmount', 'Loan_Amount_Term', 'Credit_History',
        'Land_Size_Acres', 'Input_Cost_per_Acre', 'Monthly_EMI',
        'Debt_to_Income_Ratio', 'Net_Balance_Income',
        'LoanAmount_log', 'Total_Income_log'
    ]

    all_features = categorical_features + numeric_features

    # 3. Categorical Encoding
    print("\n2. Encoding categorical variables...")
    encoders = {}
    df_encoded = df.copy()

    for col in categorical_features:
        le = LabelEncoder()
        df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
        encoders[col] = le
        print(f"   - {col} encoded: {list(le.classes_)}")

    # Target variable (Y -> 1, N -> 0)
    y = np.where(df_encoded['Loan_Status'] == 'Y', 1, 0)
    X = df_encoded[all_features]

    print(f"\n   Feature Matrix X shape: {X.shape}, Target y shape: {y.shape}")

    # 4. Train / Test Split (Stratified 80/20)
    print("\n3. Splitting into Train (80%) and Test (20%) sets with stratification...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"   Train set: {X_train.shape[0]:,} samples")
    print(f"   Test set:  {X_test.shape[0]:,} samples")

    # 5. Hyperparameter Tuning via GridSearchCV with 5-Fold Stratified CV
    print("\n4. Performing Hyperparameter Tuning via 5-Fold Cross-Validation...")
    param_grid = {
        'n_estimators': [100, 150],
        'max_depth': [8, 12, 16],
        'min_samples_split': [4, 8],
        'min_samples_leaf': [2, 4],
        'class_weight': ['balanced']
    }

    rf = RandomForestClassifier(random_state=42, n_jobs=-1)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    grid_search = GridSearchCV(
        estimator=rf,
        param_grid=param_grid,
        cv=cv,
        scoring='f1',
        verbose=1,
        n_jobs=-1
    )

    grid_search.fit(X_train, y_train)
    best_rf = grid_search.best_estimator_

    print("\n   [TUNING RESULTS]")
    print(f"   Best Parameters: {grid_search.best_params_}")
    print(f"   Best 5-Fold CV F1 Score: {grid_search.best_score_:.4f}")

    # 6. Evaluation on Test Set
    print("\n5. Evaluating Best Model on Held-Out Test Set (3,302 samples)...")
    y_pred = best_rf.predict(X_test)
    y_prob = best_rf.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_prob)

    print("\n" + "=" * 50)
    print("CLASSIFICATION REPORT:")
    print("=" * 50)
    print(classification_report(y_test, y_pred, target_names=['Denied (0)', 'Approved (1)']))
    print(f"Overall Accuracy:  {acc:.4f} ({acc*100:.2f}%)")
    print(f"Precision:         {prec:.4f}")
    print(f"Recall:            {rec:.4f}")
    print(f"F1 Score:          {f1:.4f}")
    print(f"ROC-AUC Score:     {roc_auc:.4f}")
    print("=" * 50)

    # 7. Extract Feature Importances for UI Explainability
    print("\n6. Calculating Feature Importances for Decision Explainability...")
    importances = best_rf.feature_importances_
    feature_importance_map = {}
    for col, imp in zip(all_features, importances):
        feature_importance_map[col] = round(float(imp), 4)

    # Sort descending
    sorted_importances = sorted(feature_importance_map.items(), key=lambda x: x[1], reverse=True)

    print("   Top 10 Influential Features:")
    for rank, (feat, score) in enumerate(sorted_importances[:10], 1):
        print(f"   {rank:2d}. {feat:<25} : {score*100:.2f}%")

    # 8. Save Models and Metadata
    print("\n7. Serializing Production Artifacts into ml-server/models/...")

    # A. Model
    model_path = os.path.join(MODELS_DIR, "loan_model_rf.joblib")
    joblib.dump(best_rf, model_path)
    # Also save as legacy fallback for zero downtime
    legacy_path = os.path.join(MODELS_DIR, "loan_model_v1.joblib")
    joblib.dump(best_rf, legacy_path)
    print(f"   [OK] Saved model: {model_path}")

    # B. Encoders
    encoders_path = os.path.join(MODELS_DIR, "loan_encoders.joblib")
    joblib.dump(encoders, encoders_path)
    print(f"   [OK] Saved encoders: {encoders_path}")

    # C. Feature Importances
    fi_path = os.path.join(MODELS_DIR, "loan_feature_importances.json")
    with open(fi_path, "w") as f:
        json.dump(dict(sorted_importances), f, indent=2)
    print(f"   [OK] Saved feature importances: {fi_path}")

    # D. Metadata
    meta_path = os.path.join(MODELS_DIR, "loan_model_metadata.json")
    metadata = {
        "model_type": "RandomForestClassifier",
        "best_params": grid_search.best_params_,
        "features": all_features,
        "categorical_features": categorical_features,
        "numeric_features": numeric_features,
        "metrics": {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "roc_auc": round(float(roc_auc), 4)
        },
        "dataset_rows": len(df),
        "train_rows": len(X_train),
        "test_rows": len(X_test)
    }
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"   [OK] Saved metadata: {meta_path}")

    # -----------------------------------------------------------------------
    # Built-in Verification Suite
    # -----------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("VERIFICATION SUITE (Self-Test)")
    print("=" * 70)
    assert os.path.exists(model_path), "Error: Model file not created!"
    assert os.path.exists(encoders_path), "Error: Encoders file not created!"
    assert os.path.exists(fi_path), "Error: Feature importances file not created!"
    assert acc >= 0.80, f"Error: Model accuracy ({acc:.2%}) is below 80% threshold!"
    assert f1 >= 0.80, f"Error: Model F1 score ({f1:.2%}) is below 80% threshold!"

    print("[PASS] Model serialized successfully to .joblib.")
    print("[PASS] Categorical encoders saved.")
    print("[PASS] Feature importances computed for explainability.")
    print(f"[PASS] Accuracy exceeds threshold: {acc:.2%} >= 80%.")
    print(f"[PASS] F1 Score exceeds threshold: {f1:.2%} >= 80%.")
    print("=" * 70)
    print("Random Forest training complete! Ready for Flask endpoint integration.")

if __name__ == "__main__":
    train_and_tune_model()
