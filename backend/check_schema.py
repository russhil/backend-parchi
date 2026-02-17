"""
Migration script to add missing columns to the Supabase patients table.
Run this once to update your database schema.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY not set in .env")
    exit(1)

try:
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✓ Connected to Supabase")
    
    # Get the existing schema to see if columns need to be added
    result = client.table("patients").select("*").limit(1).execute()
    
    if result.data:
        patient = result.data[0]
        has_phone = "phone" in patient
        has_email = "email" in patient
        has_address = "address" in patient
        
        print(f"Current columns in patients table:")
        print(f"  - phone: {has_phone}")
        print(f"  - email: {has_email}")
        print(f"  - address: {has_address}")
        
        if not has_phone or not has_email or not has_address:
            print("\n⚠️  Missing columns detected!")
            print("You need to add these columns in your Supabase database.")
            print("\n1. Go to https://supabase.com/dashboard")
            print("2. Select your project")
            print("3. Go to SQL Editor")
            print("4. Create a new query and run this SQL:")
            print("""
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
            """)
        else:
            print("\n✓ All required columns exist!")
    else:
        print("Could not check schema - no patients found, but table exists")
        
except Exception as e:
    print(f"Error: {e}")
    print("\nMake sure you have:")
    print("1. Created a 'patients' table in Supabase")
    print("2. Set SUPABASE_URL and SUPABASE_KEY in .env")
