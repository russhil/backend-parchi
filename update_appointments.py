import os
import random
import sys
from dotenv import load_dotenv

# Ensure we are running from backend directory or set pythonpath
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_supabase

load_dotenv()

REALISTIC_REASONS = [
    "Annual physical check-up",
    "Persistent cough and cold symptoms",
    "Follow-up for hypertension management",
    "Consultation for back pain",
    "Routine blood work analysis",
    "Skin rash evaluation",
    "Prescription renewal for asthma",
    "Joint pain in knees",
    "Headache and migraine consultation",
    "Digestive issues and stomach pain",
    "Flu vaccination",
    "Diabetes monitoring check-up",
    "Allergy symptoms assessment",
    "Sore throat and fever",
    "Anxiety and stress management",
    "Insomnia and sleep disorder maintainance",
    "Weight management consultation",
    "Ear infection check",
    "Eye irritation and vision check",
    "General fatigue and weakness"
]

def update_appointments():
    print("🔄 Starting appointment reasons update...")
    
    supabase = get_supabase()
    
    # Fetch all appointments
    try:
        response = supabase.table("appointments").select("id").execute()
        appointments = response.data
        print(f"Found {len(appointments)} appointments to update.")
    except Exception as e:
        print(f"❌ Error fetching appointments: {e}")
        return

    updated_count = 0
    for appt in appointments:
        appt_id = appt['id']
        new_reason = random.choice(REALISTIC_REASONS)
        
        try:
            supabase.table("appointments").update({"reason": new_reason}).eq("id", appt_id).execute()
            updated_count += 1
            if updated_count % 10 == 0:
                print(f"  ... Updated {updated_count} appointments")
        except Exception as e:
            print(f"  ! Error updating appointment {appt_id}: {e}")

    print(f"✅ Successfully updated {updated_count} appointments with realistic reasons.")

if __name__ == "__main__":
    update_appointments()
