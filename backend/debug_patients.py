
import os
import sys
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_all_patients

load_dotenv()

def debug_patient_data():
    print("--- Debugging Patient Data Types ---")
    patients = get_all_patients()
    print(f"Fetched {len(patients)} patients.")

    for i, p in enumerate(patients):
        print(f"\nPatient {i}: {p.get('name')} (ID: {p.get('id')})")
        
        conditions = p.get('conditions')
        print(f"  conditions raw: {repr(conditions)} (Type: {type(conditions)})")
        
        normalized = conditions or []
        print(f"  normalized: {repr(normalized)} (Type: {type(normalized)})")
        
        try:
            joined = ", ".join(normalized)
            print(f"  joined: '{joined}'")
        except TypeError as e:
            print(f"  ❌ JOIN ERROR: {e}")
            
        # Check other fields too
        meds = p.get('medications')
        print(f"  medications raw: {repr(meds)} (Type: {type(meds)})")
        try:
            ", ".join(meds or [])
        except TypeError as e:
            print(f"  ❌ MEDS JOIN ERROR: {e}")

if __name__ == "__main__":
    debug_patient_data()
