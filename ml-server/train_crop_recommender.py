import os
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib

def main():
    dataset_path = 'Crop_recommendation.csv'
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset '{dataset_path}' not found in current directory.")

    print(f"Loading dataset from {dataset_path}...")
    df = pd.read_csv(dataset_path)
    print(f"Loaded {len(df)} rows with columns: {list(df.columns)}")

    feature_cols = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
    target_col = 'label'

    X = df[feature_cols]
    y = df[target_col].str.strip().str.title()

    unique_crops = sorted(y.unique())
    print(f"Target classes count: {len(unique_crops)} crops: {unique_crops}")

    # Stratified Train/Test Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("\nTraining RandomForestClassifier (n_estimators=100)...")
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=16,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train, y_train)

    # Evaluation
    y_pred = clf.predict(X_test)
    test_acc = accuracy_score(y_test, y_pred)
    cv_scores = cross_val_score(clf, X, y, cv=5)

    print("\n================ Model Evaluation ================")
    print(f"Test Accuracy: {test_acc * 100:.2f}%")
    print(f"5-Fold CV Accuracy: {cv_scores.mean() * 100:.2f}% (+/- {cv_scores.std() * 100:.2f}%)")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    # Save serialized model
    os.makedirs('models', exist_ok=True)
    model_output_path = os.path.join('models', 'crop_recommender_v1.joblib')
    joblib.dump(clf, model_output_path)
    print(f"Saved recommender model to: {model_output_path}")

    # Also save metadata with expected feature names and class list
    metadata = {
        'feature_names': feature_cols,
        'classes': list(clf.classes_),
        'test_accuracy': float(test_acc)
    }
    meta_path = os.path.join('models', 'crop_recommender_meta.joblib')
    joblib.dump(metadata, meta_path)
    print(f"Saved metadata to: {meta_path}")
    print("Crop Recommender training completed successfully.")

if __name__ == '__main__':
    main()
