import os
import sys
import uuid
import random
import time
import io
from datetime import datetime, timedelta

# Add current directory to path so we can import database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_supabase, create_patient, create_appointment, create_document, create_clinical_dump
from supabase_storage import ensure_bucket_exists, upload_file

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
except ImportError:
    print("ReportLab not found. Please install it with: pip install reportlab")
    sys.exit(1)

# --- reset database ---
def reset_database():
    """Truncate all tables to start fresh."""
    print("Resetting database...")
    client = get_supabase()
    
    # Order matters for foreign keys
    tables = [
        "consult_sessions", 
        "clinical_dumps", 
        "differential_diagnoses", 
        "ai_intake_summaries", 
        "report_insights", 
        "prescriptions", 
        "notes",
        "documents", 
        "visits", 
        "appointments", 
        "patients"
    ]
    
    for table in tables:
        try:
            # Using delete() without filters to truncate
            client.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute() # Hack to delete all
            print(f"  - Truncated {table}")
        except Exception as e:
            print(f"  - Error truncating {table}: {e}")

    # Re-apply schema changes if needed (e.g. file_url column)
    # Ideally we'd run schema.sql here, but for now we rely on the manual update or prior migration.
    print("Database reset complete.")

# --- generate pdf ---
def generate_pdf_bytes(title, content_lines):
    """Generate a simple PDF in memory."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(1 * inch, height - 1 * inch, title)
    
    c.setFont("Helvetica", 12)
    y_position = height - 1.5 * inch
    
    for line in content_lines:
        if y_position < 1 * inch:
            c.showPage()
            y_position = height - 1 * inch
            c.setFont("Helvetica", 12)
            
        c.drawString(1 * inch, y_position, line)
        y_position -= 0.25 * inch
        
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

# --- seed data ---

PATIENTS = [
    {
        "name": "Sarah Jenkins",
        "age": 42,
        "gender": "Female",
        "phone": "+15550101010",
        "email": "sarah.j@example.com",
        "address": "123 Maple Dr, Springfield",
        "height_cm": 165,
        "weight_kg": 85,
        "conditions": ["Hypertension", "Type 2 Diabetes", "Obesity"],
        "medications": ["Lisinopril 10mg", "Metformin 500mg"],
        "allergies": ["Penicillin (Hives)", "Sulfa Drugs"],
        "history": "Diagnosed with T2DM 3 years ago. Poor adherence to diet. Hypertension well-controlled on medication.",
        "documents": [
            {
                "title": "Lab Results - HbA1c",
                "type": "lab_report",
                "days_ago": 10,
                "content": [
                    "Patient: Sarah Jenkins",
                    "Date: " + (datetime.now() - timedelta(days=10)).strftime("%Y-%m-%d"),
                    "Test: Hemoglobin A1c",
                    "Result: 7.8% (High)",
                    "Reference Range: 4.0% - 5.6%",
                    "",
                    "Notes: Indicates poor glycemic control over past 3 months."
                ]
            },
            {
                "title": "Cardiology Referral",
                "type": "referral",
                "days_ago": 45,
                "content": [
                    " referral Letter",
                    "To: Dr. Smith, Cardiology",
                    "From: Dr. House",
                    "Re: Sarah Jenkins",
                    "",
                    "Patient has history of uncontrolled hypertension and recent palpitations.",
                    "Please evaluate for arrhythmia."
                ]
            }
        ]
    },
    {
        "name": "Michael Chen",
        "age": 35,
        "gender": "Male",
        "phone": "+15550202020",
        "email": "m.chen@example.com",
        "address": "456 Oak Ln, Metropolis",
        "height_cm": 178,
        "weight_kg": 75,
        "conditions": ["Asthma", "Seasonal Allergies"],
        "medications": ["Albuterol Inhaler (PRN)", "Fluticasone"],
        "allergies": ["Peanuts", "Dust Mites"],
        "history": "History of childhood asthma. Recent exacerbation due to pollen. Uses rescue inhaler 2x/week.",
        "documents": [
            {
                "title": "Pulmonary Function Test",
                "type": "lab_report",
                "days_ago": 5,
                "content": [
                    "Patient: Michael Chen",
                    "Date: " + (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
                    "FEV1: 3.2L (85% predicted)",
                    "FVC: 4.5L (95% predicted)",
                    "FEV1/FVC: 71%",
                    "",
                    "Interpretation: Mild obstruction, reversible with bronchodilator."
                ]
            }
        ]
    },
    {
        "name": "Emily Rodriguez",
        "age": 28,
        "gender": "Female",
        "phone": "+15550303030",
        "email": "emily.r@example.com",
        "address": "789 Pine St, Gotham",
        "height_cm": 162,
        "weight_kg": 58,
        "conditions": ["Pregnancy (1st Trimester)", "Iron Deficiency Anemia"],
        "medications": ["Prenatal Vitamins", "Ferrous Sulfate"],
        "allergies": ["None"],
        "history": "G1P0. LMP 8 weeks ago. Complains of morning sickness and fatigue.",
        "documents": [
            {
                "title": "Ultrasound Report",
                "type": "imaging",
                "days_ago": 2,
                "content": [
                    "Patient: Emily Rodriguez",
                    "Date: " + (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
                    "Exam: Transvaginal Ultrasound",
                    "",
                    "Findings:",
                    "- Single intrauterine gestation identified.",
                    "- Crown-Rump Length (CRL) consistent with 8 weeks 2 days.",
                    "- Fetal Heart Rate: 155 bpm (Normal).",
                    "",
                    "Impression: Viable intrauterine pregnancy."
                ]
            }
        ]
    }
]

def seed():
    print("Starting realistic seeder...")
    
    # 1. Reset
    reset_database()
    
    # 2. Ensure Bucket
    print("Checking storage bucket...")
    ensure_bucket_exists()
    
    for p_data in PATIENTS:
        print(f"\nProcessing {p_data['name']}...")
        
        # Create Patient
        patient_payload = {k: v for k, v in p_data.items() if k not in ["history", "documents"]}
        patient = create_patient(patient_payload)
        
        if not patient:
            print("  Failed to create patient.")
            continue
            
        pid = patient['id']
        print(f"  Created patient ID: {pid}")
        
        # Create Appointment (Tomorrow 10am)
        appt_time = (datetime.now() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
        appt = create_appointment({
            "patient_id": pid,
            "start_time": appt_time.isoformat(),
            "status": "scheduled",
            "reason": "Follow-up checkup"
        })
        print(f"  Created appointment ID: {appt.get('id')}")
        
        # Create Clinical Dump
        if "history" in p_data:
            create_clinical_dump({
                "id": str(uuid.uuid4()),
                "patient_id": pid,
                "appointment_id": appt.get('id'),
                "manual_notes": p_data["history"],
                "combined_dump": p_data["history"]
            })
            print("  Created clinical dump with history.")
            
        # Create Documents
        for doc_def in p_data.get("documents", []):
            print(f"  Generating document: {doc_def['title']}...")
            
            # 1. Generate PDF
            pdf_bytes = generate_pdf_bytes(doc_def['title'], doc_def['content'])
            
            # 2. Upload
            filename = f"{pid}_{int(time.time())}_{doc_def['type']}.pdf"
            public_url = ""
            
            try:
                print(f"    Attempting Supabase upload for {filename}...")
                public_url = upload_file(pdf_bytes, filename, "application/pdf")
                print(f"    Uploaded to: {public_url}")
            except Exception as e:
                print(f"    Supabase upload failed ({e}). Falling back to local storage.")
                # Fallback to local frontend/public
                frontend_public_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "public", "patient_docs")
                os.makedirs(frontend_public_dir, exist_ok=True)
                local_path = os.path.join(frontend_public_dir, filename)
                with open(local_path, "wb") as f:
                    f.write(pdf_bytes)
                public_url = f"/patient_docs/{filename}"
                print(f"    Saved locally to: {public_url}")

            # 3. Create DB Record
            if public_url:
                doc_record = {
                    "patient_id": pid,
                    "title": doc_def['title'],
                    "doc_type": doc_def['type'],
                    "extracted_text": "\n".join(doc_def['content']), # Simulating extraction
                    "file_url": public_url,
                    "uploaded_at": (datetime.now() - timedelta(days=doc_def['days_ago'])).isoformat()
                }
                create_document(doc_record)
                print("    Database record created.")

    print("\n\nSeeding complete!")

if __name__ == "__main__":
    seed()
