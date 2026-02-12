import os
import sys
import uuid
from datetime import datetime, timedelta

# Add current directory to path so we can import database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import create_patient, create_appointment, create_clinical_dump

def seed():
    # 1. Create Patient
    print("Creating patient (Sarah Jenkins)...")
    patient_data = {
        "name": "Sarah Jenkins",
        "age": 42,
        "gender": "Female",
        "phone": "+15550123456",
        "conditions": ["Obesity", "Hyperlipidemia"],
        "medications": ["Atorvastatin 20mg"],
        "allergies": ["Penicillin (Hives)"]
    }
    
    try:
        patient = create_patient(patient_data)
        if not patient:
            print("Failed to create patient.")
            return

        patient_id = patient['id']
        print(f"Patient created: {patient['name']} (ID: {patient_id})")

        # 2. Create Appointment
        print("Creating appointment...")
        # Set for tomorrow at 10 AM
        tomorrow = datetime.now() + timedelta(days=1)
        tomorrow_10am = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        appointment_data = {
            "patient_id": patient_id,
            "start_time": tomorrow_10am.isoformat(),
            "status": "scheduled",
            "reason": "Severe abdominal pain after eating"
        }
        
        appointment = create_appointment(appointment_data)
        if not appointment:
            print("Failed to create appointment.")
            return
            
        appointment_id = appointment['id']
        print(f"Appointment created for {appointment['start_time']} (ID: {appointment_id})")

        # 3. Create Clinical Dump
        print("Creating clinical dump...")
        
        transcript_text = """
    Patient: I've been having this really bad pain in my stomach.
    Doctor: Can you point to where it hurts?
    Patient: It's mostly here, on the right side, just under my ribs.
    Doctor: When did it start?
    Patient: About two days ago, right after dinner. We had burgers and fries. It was agonizing.
    Doctor: Does the pain go anywhere else?
    Patient: Yeah, it shoots up to my right shoulder sometimes.
    Doctor: Have you thrown up?
    Patient: Twice. Just food, no blood or anything green.
    Doctor: Any fever?
    Patient: I felt hot and shivery last night.
    Doctor: Any yellowing of your eyes or skin?
    Patient: No, I checked in the mirror.
    Doctor: Any medical conditions we should know about?
    Patient: My old doctor said my cholesterol is high, and I need to lose weight. I take a pill for the cholesterol.
    Doctor: Any allergies?
    Patient: Just penicillin. It gives me a bad rash.
        """
        
        manual_notes = """
    - 42yo F with RUQ pain x2 days.
    - Onset post-prandial (fatty meal).
    - Radiation: Right scapula.
    - Assoc: Nausea/Vomiting x2, subjective fever.
    - Neg: Jaundice, acholic stools.
    - PMH: Hyperlipidemia, Obesity.
    - Meds: Atorvastatin.
    - All: Penicillin.
        """
        
        # Manually generating ID since the table seems to lack a default generator
        dump_data = {
            "id": str(uuid.uuid4()),
            "patient_id": patient_id,
            "appointment_id": appointment_id,
            "transcript_text": transcript_text.strip(),
            "manual_notes": manual_notes.strip(),
            "combined_dump": transcript_text.strip() + "\n\n" + manual_notes.strip()
        }
        
        try:
            dump = create_clinical_dump(dump_data)
            if dump:
                print(f"Clinical dump created (ID: {dump.get('id', 'unknown')})")
            else:
                print("Failed to create clinical dump (returned empty).")
        except Exception as e:
            print(f"Error creating clinical dump: {e}")
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    seed()
