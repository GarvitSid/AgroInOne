import pandas as pd
import json
import os

def clean_agricultural_data():
    print("Loading raw dataset...")
    try:
        df = pd.read_csv('raw_crop_production.csv')
    except FileNotFoundError:
        print("Error: 'raw_crop_production.csv' not found in ml-server/.")
        print("Download the 'Crop Production in India' dataset from Kaggle and place it here.")
        return

    print(f"Initial row count: {len(df)}")

    # 1. Rename columns to match the ML training script and React frontend payload
    df = df.rename(columns={
        'State_Name':   'State',
        'District_Name': 'District',
        'Crop_Year':    'Year',
        # 'Season', 'Crop', 'Area', 'Production' keep their names
    })

    # 2. Drop rows where the target variable or area are missing
    df = df.dropna(subset=['Production', 'Area'])
    print(f"Row count after dropping missing values: {len(df)}")

    # 3. Standardize text: strip invisible whitespace, apply Title Case
    #    This ensures "kharif " == "Kharif" and avoids duplicate encoder classes
    categorical_cols = ['State', 'District', 'Crop', 'Season']
    for col in categorical_cols:
        df[col] = df[col].astype(str).str.strip().str.title()

    # 4. Save cleaned dataset ready for train_crop_model.py
    output_filename = 'crop_data.csv'
    df.to_csv(output_filename, index=False)
    print(f"Cleaned data saved as '{output_filename}'.")

    # -----------------------------------------------------------------------
    # 5. Export unique vocabulary as sorted JSON arrays into backend/data/.
    #    These overwrite the static state/district/crop/season JSON files so
    #    the Node.js /api/predict/options endpoint returns exactly the values
    #    the LabelEncoder was trained on — preventing encode_safe() fallbacks.
    # -----------------------------------------------------------------------
    print("Exporting dropdown vocabulary for Node.js backend...")
    options = {
        'state':    sorted(df['State'].unique().tolist()),
        'district': sorted(df['District'].unique().tolist()),
        'crop':     sorted(df['Crop'].unique().tolist()),
        'season':   sorted(df['Season'].unique().tolist()),
    }

    backend_data_dir = os.path.join('..', 'backend', 'data')
    os.makedirs(backend_data_dir, exist_ok=True)

    for key, values in options.items():
        filepath = os.path.join(backend_data_dir, f'{key}.json')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(values, f, ensure_ascii=False, indent=2)
        print(f"  Wrote {len(values)} entries -> {filepath}")

    print("\nSuccess! Run train_crop_model.py next.")

if __name__ == "__main__":
    clean_agricultural_data()
