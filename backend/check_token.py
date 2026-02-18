from auth import create_access_token, SECRET_KEY, ALGORITHM
from datetime import timedelta
import os

def test_token():
    print("--- Testing Token Generation ---")
    try:
        print(f"Secret Key exists: {bool(SECRET_KEY)}")
        print(f"Algorithm: {ALGORITHM}")
        
        data = {"sub": "test_user", "clinic_id": "test_clinic"}
        token = create_access_token(data, timedelta(minutes=15))
        
        print(f"✅ Token generated successfully: {token[:20]}...")
    except Exception as e:
        print(f"❌ Error generating token: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_token()
