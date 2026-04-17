import pandas as pd
import numpy as np
import os
import argparse

def audit_dataset(filepath):
    print(f"Loading dataset from: {filepath}")
    if not os.path.exists(filepath):
        print("File not found.")
        return
        
    df = pd.read_csv(filepath)
    print(f"Dataset Shape: {df.shape}")
    print("-" * 50)
    
    # DOMAIN 04: Statistical Analysis
    print("DOMAIN 04: Statistical Analysis")
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        # Detect extreme values (Z-score > 3)
        z_scores = np.abs((df[col] - df[col].mean()) / df[col].std())
        extreme_count = (z_scores > 3).sum()
        if extreme_count > 0:
            print(f"  - {col}: Found {extreme_count} extreme values (Z-score > 3).")
            
        # Flag negative values in logical columns (like Price, Mileage)
        if col in ['Price', 'Mileage', 'Engine Size', 'Year']:
            negative_count = (df[col] < 0).sum()
            if negative_count > 0:
                print(f"  - {col}: Found {negative_count} negative values.")
                
    # Flag values outside logical or business-defined ranges
    if 'Brand' in df.columns and 'Fuel Type' in df.columns:
        invalid_teslas = df[(df['Brand'] == 'Tesla') & (df['Fuel Type'].isin(['Petrol', 'Diesel']))]
        if len(invalid_teslas) > 0:
            print(f"  - Business Rule Violation: Found {len(invalid_teslas)} Tesla cars listed with Petrol or Diesel fuel types.")
            
    print("-" * 50)
    
    # DOMAIN 08: Deduplication
    print("DOMAIN 08: Deduplication")
    duplicates = df.duplicated().sum()
    print(f"  - Found {duplicates} exact duplicate rows.")
    # Assuming Car ID is a unique identifier:
    if 'Car ID' in df.columns:
        id_duplicates = df['Car ID'].duplicated().sum()
        print(f"  - Found {id_duplicates} duplicate Car IDs.")
    print("-" * 50)
    
    # DOMAIN 07: Categorical Data Quality
    print("DOMAIN 07: Categorical Data Quality")
    cat_cols = df.select_dtypes(include=['object']).columns
    for col in cat_cols:
        unique_vals = df[col].unique()
        print(f"  - {col}: {len(unique_vals)} unique values.")
        # Check for unexpected casing or whitespace
        if df[col].str.contains(r'^\s+|\s+$', regex=True).any():
            print(f"    - {col} has trailing/leading whitespaces.")
    print("-" * 50)
    
    # DOMAIN 02: Data Formatting & Standardization
    print("DOMAIN 02: Data Formatting & Standardization")
    print("  - Data Types Check:")
    print(df.dtypes)
    # Checking for hidden characters or wrong encodings in string columns
    for col in cat_cols:
        # Check for non-ascii characters
        non_ascii = df[col].dropna().apply(lambda x: not str(x).isascii()).sum()
        if non_ascii > 0:
            print(f"  - {col}: Found {non_ascii} entries with non-ASCII characters.")
    print("-" * 50)
    
    # DOMAIN 06: Visual & Trend Analysis
    print("DOMAIN 06: Visual & Trend Analysis")
    print("  - Visual analysis is typically done via plots. Check counts over time (Year):")
    if 'Year' in df.columns:
        year_counts = df['Year'].value_counts().sort_index()
        print(year_counts.to_string())
    print("-" * 50)
    
    # DOMAIN 03: Relational Integrity
    print("DOMAIN 03: Relational Integrity")
    print("  - Single table provided. Relational checks (foreign keys, orphan rows) skipped.")
    print("-" * 50)
    
    # Completeness & Coverage
    print("Completeness & Coverage")
    null_counts = df.isnull().sum()
    total_rows = len(df)
    for col, null_count in null_counts.items():
        if null_count > 0:
            pct_missing = (null_count / total_rows) * 100
            print(f"  - {col}: {null_count} missing values ({pct_missing:.2f}%).")
            if pct_missing > 50:
                 print(f"    - WARNING: {col} has excessive missing values!")
    print("-" * 50)

def clean_dataset(filepath, output_filepath):
    print(f"\nCleaning dataset: {filepath}")
    if not os.path.exists(filepath):
        print("File not found.")
        return
        
    df = pd.read_csv(filepath)
    initial_shape = df.shape
    
    # 1. Deduplication
    df = df.drop_duplicates()
    if 'Car ID' in df.columns:
        df = df.drop_duplicates(subset=['Car ID'], keep='first')
        
    # 2. Completeness (Drop rows where all features are NaN)
    df = df.dropna(how='all')
    # Let's drop rows where essential fields are missing
    if 'Brand' in df.columns and 'Price' in df.columns:
        df = df.dropna(subset=['Brand', 'Price'])
        
    # 3. Categorical Data Quality & Formatting
    cat_cols = df.select_dtypes(include=['object', 'string']).columns
    for col in cat_cols:
        # Strip whitespaces and standardize to title case
        df[col] = df[col].astype(str).str.strip().str.title()
        # Replace 'Nan' string with actual np.nan
        df[col] = df[col].replace('Nan', np.nan)
        
    # 4. Statistical Analysis & Business Rules
    # Remove negative values in logical columns
    for col in ['Price', 'Mileage', 'Engine Size', 'Year']:
        if col in df.columns:
            df = df[df[col] >= 0]
            
    # Remove Teslas with Petrol/Diesel
    if 'Brand' in df.columns and 'Fuel Type' in df.columns:
        invalid_teslas = (df['Brand'] == 'Tesla') & (df['Fuel Type'].isin(['Petrol', 'Diesel']))
        df = df[~invalid_teslas]
        
    # Remove extreme Engine Sizes (e.g., > 10.0L or <= 0.0)
    if 'Engine Size' in df.columns:
        df = df[(df['Engine Size'] > 0) & (df['Engine Size'] <= 10.0)]
        
    # 5. Imputation for Completeness & Coverage
    print("Imputing missing values...")
    # Fill numeric columns with median
    num_cols = df.select_dtypes(include=[np.number]).columns
    for col in num_cols:
        if df[col].isnull().sum() > 0:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)
            print(f"  - Filled missing in {col} with median: {median_val}")
            
    # Fill categorical columns with mode
    cat_cols = df.select_dtypes(include=['object', 'string']).columns
    for col in cat_cols:
        if df[col].isnull().sum() > 0:
            mode_val = df[col].mode()[0]
            df[col] = df[col].fillna(mode_val)
            print(f"  - Filled missing in {col} with mode: {mode_val}")

    print(f"Data Cleaning complete.")
    print(f"Initial Shape: {initial_shape} -> Cleaned Shape: {df.shape}")
    print(f"Rows removed: {initial_shape[0] - df.shape[0]}")
    
    df.to_csv(output_filepath, index=False)
    print(f"Cleaned dataset saved as: {output_filepath}")

if __name__ == "__main__":
    input_file = "car_price_prediction_with_missing.csv"
    audit_dataset(input_file)
    clean_dataset(input_file, "cleaned_car_price_prediction.csv")
