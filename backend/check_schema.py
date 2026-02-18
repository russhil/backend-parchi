from database import get_supabase
import sys
import os
from dotenv import load_dotenv

load_dotenv()

def check_db():
    print("Checking database connection...")
    try:
        client = get_supabase()
        print("Connected to Supabase.")
        
        # Check users table
        print("Checking users table schema...")
        res = client.table("users").select("*").limit(1).execute()
        print(f"Users table check: Success. Found {len(res.data)} rows.")
        if res.data:
            print(f"Sample user: {res.data[0]}")
            
        # Check clinics table
        print("Checking clinics table schema...")
        res = client.table("clinics").select("*").limit(1).execute()
        print(f"Clinics table check: Success. Found {len(res.data)} rows.")

        print("Database check complete.")
        return True

    except Exception as e:
        print(f"Database check failed: {e}")
        return False

if __name__ == "__main__":
    success = check_db()
    sys.exit(0 if success else 1)
