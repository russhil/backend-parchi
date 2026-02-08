"""
Synthetic Patient Data Generator for GEPA Training
Generates realistic Indian patient cases for prompt optimization.
"""

import random
from typing import Dict, List, Any

# Indian names pool
FIRST_NAMES_MALE = [
    "Rajesh", "Amit", "Suresh", "Vikram", "Arun", "Deepak", "Manoj", "Rahul",
    "Sanjay", "Pradeep", "Kiran", "Ashok", "Vijay", "Ravi", "Sunil", "Mohan",
    "Anand", "Krishna", "Gopal", "Ramesh", "Aditya", "Arjun", "Rohan", "Nikhil"
]

FIRST_NAMES_FEMALE = [
    "Priya", "Sunita", "Kavita", "Anjali", "Meera", "Lakshmi", "Pooja", "Neha",
    "Rekha", "Geeta", "Shalini", "Deepa", "Anita", "Rashmi", "Swati", "Madhu",
    "Savita", "Jyoti", "Ritu", "Shikha", "Divya", "Shruti", "Pallavi", "Nandini"
]

LAST_NAMES = [
    "Sharma", "Patel", "Singh", "Kumar", "Verma", "Gupta", "Reddy", "Iyer",
    "Nair", "Pillai", "Rao", "Das", "Chatterjee", "Banerjee", "Mehta", "Shah",
    "Joshi", "Desai", "Kulkarni", "Patil", "Agarwal", "Mishra", "Saxena", "Kapoor"
]

# Common conditions in Indian clinical practice
CONDITIONS = [
    "Type 2 Diabetes Mellitus",
    "Hypertension",
    "Hypothyroidism",
    "Coronary Artery Disease",
    "Chronic Kidney Disease Stage 3",
    "Asthma",
    "COPD",
    "Rheumatoid Arthritis",
    "Osteoarthritis",
    "Migraine",
    "GERD",
    "Fatty Liver Disease",
    "Anemia",
    "Vitamin D Deficiency",
    "Hyperlipidemia",
    "Obesity",
    "Anxiety Disorder",
    "Depression",
    "Psoriasis",
    "Allergic Rhinitis",
]

# Common medications
MEDICATIONS = [
    "Metformin 500mg BD",
    "Amlodipine 5mg OD",
    "Telmisartan 40mg OD",
    "Atorvastatin 10mg HS",
    "Aspirin 75mg OD",
    "Levothyroxine 50mcg OD",
    "Pantoprazole 40mg OD",
    "Metoprolol 25mg BD",
    "Losartan 50mg OD",
    "Glimepiride 2mg OD",
    "Sitagliptin 100mg OD",
    "Rosuvastatin 10mg HS",
    "Clopidogrel 75mg OD",
    "Montelukast 10mg OD",
    "Salbutamol inhaler PRN",
    "Vitamin D3 60000 IU weekly",
    "Iron + Folic Acid OD",
    "Calcium 500mg BD",
    "Omeprazole 20mg OD",
    "Cetirizine 10mg OD",
]

# Common allergies
ALLERGIES = [
    "Penicillin",
    "Sulfa drugs",
    "NSAIDs",
    "Aspirin",
    "Shellfish",
    "Peanuts",
    "Latex",
    "Iodine contrast",
    "Dust",
    "Pollen",
    "None known",
]

# Chief complaints
CHIEF_COMPLAINTS = [
    {
        "complaint": "chest pain and breathlessness on exertion for 2 weeks",
        "symptoms": ["chest pain", "breathlessness", "fatigue"],
        "severity": "7/10",
        "onset": "2 weeks ago, gradually worsening",
    },
    {
        "complaint": "persistent headache and dizziness for 5 days",
        "symptoms": ["headache", "dizziness", "nausea"],
        "severity": "6/10",
        "onset": "5 days ago",
    },
    {
        "complaint": "uncontrolled blood sugar levels despite medication",
        "symptoms": ["polyuria", "polydipsia", "fatigue", "blurred vision"],
        "severity": "5/10",
        "onset": "Past 1 month",
    },
    {
        "complaint": "joint pain and morning stiffness in both knees",
        "symptoms": ["joint pain", "stiffness", "swelling", "difficulty walking"],
        "severity": "6/10",
        "onset": "3 months, progressively worsening",
    },
    {
        "complaint": "recurrent episodes of wheezing and cough at night",
        "symptoms": ["wheezing", "cough", "shortness of breath", "chest tightness"],
        "severity": "5/10",
        "onset": "Past 2 weeks, especially at night",
    },
    {
        "complaint": "acid reflux and burning sensation after meals",
        "symptoms": ["heartburn", "regurgitation", "bloating", "epigastric pain"],
        "severity": "4/10",
        "onset": "1 month ago",
    },
    {
        "complaint": "fatigue, weight gain, and cold intolerance",
        "symptoms": ["fatigue", "weight gain", "cold intolerance", "constipation", "dry skin"],
        "severity": "5/10",
        "onset": "Gradual over 3-4 months",
    },
    {
        "complaint": "burning urination and lower abdominal pain for 3 days",
        "symptoms": ["dysuria", "frequency", "urgency", "lower abdominal pain"],
        "severity": "6/10",
        "onset": "3 days ago, sudden onset",
    },
    {
        "complaint": "skin rash with itching on arms and legs",
        "symptoms": ["rash", "itching", "redness", "dry patches"],
        "severity": "4/10",
        "onset": "1 week ago",
    },
    {
        "complaint": "anxiety, sleep disturbance, and palpitations",
        "symptoms": ["anxiety", "insomnia", "palpitations", "restlessness"],
        "severity": "6/10",
        "onset": "Past 2 months, worsening with work stress",
    },
]

# Visit summaries
VISIT_SUMMARIES = [
    "Routine follow-up. Vitals stable. Medications refilled for 3 months.",
    "Complained of increased fatigue. Lab tests ordered. Advised diet modification.",
    "Blood pressure elevated at 150/95. Medication dosage adjusted. Review in 2 weeks.",
    "HbA1c at 8.2%, slightly above target. Dietary counseling provided. Added glimepiride.",
    "Respiratory examination clear. Inhaler technique reviewed. Continue current management.",
    "Lipid profile improved. Continue statin therapy. Annual cardiac review scheduled.",
    "Thyroid function tests normal on current dose. Continue levothyroxine.",
    "Knee X-ray shows mild osteoarthritis. Started on glucosamine. Physiotherapy advised.",
    "ECG and Echo normal. Chest pain likely musculoskeletal. NSAIDs prescribed.",
    "GERD symptoms improved. Reduce PPI to maintenance dose. Avoid trigger foods.",
]

# Documents
DOCUMENT_TYPES = [
    {"type": "lab_report", "title": "CBC Report", "content": "WBC: 8500/cumm, RBC: 4.5 million/cumm, Hb: 12.8 g/dL, Platelets: 250000/cumm"},
    {"type": "lab_report", "title": "HbA1c Report", "content": "HbA1c: 7.8% (Target <7%), Fasting glucose: 142 mg/dL"},
    {"type": "lab_report", "title": "Lipid Profile", "content": "Total Cholesterol: 195 mg/dL, LDL: 118 mg/dL, HDL: 45 mg/dL, Triglycerides: 165 mg/dL"},
    {"type": "lab_report", "title": "Thyroid Profile", "content": "TSH: 4.2 mIU/L, T3: 1.1 ng/mL, T4: 8.5 µg/dL"},
    {"type": "lab_report", "title": "Kidney Function Test", "content": "Creatinine: 1.1 mg/dL, BUN: 18 mg/dL, eGFR: 72 mL/min"},
    {"type": "imaging", "title": "Chest X-Ray", "content": "Heart size normal. Lung fields clear. No active pulmonary lesion."},
    {"type": "imaging", "title": "ECG Report", "content": "Normal sinus rhythm. Rate 78 bpm. No ST-T changes."},
    {"type": "imaging", "title": "Ultrasound Abdomen", "content": "Liver: Mild fatty changes. Kidneys: Normal size and echotexture. No calculi."},
    {"type": "prescription", "title": "Previous Prescription", "content": "1. Metformin 500mg BD 2. Amlodipine 5mg OD 3. Atorvastatin 10mg HS"},
    {"type": "referral", "title": "Cardiologist Referral", "content": "Referred for evaluation of chest pain. Echo and stress test recommended."},
]


def generate_vitals() -> Dict[str, Any]:
    """Generate realistic vital signs."""
    bp_systolic = random.randint(110, 160)
    bp_diastolic = random.randint(70, 100)
    
    return {
        "bp_systolic": bp_systolic,
        "bp_diastolic": bp_diastolic,
        "heart_rate": random.randint(60, 100),
        "spo2": random.randint(94, 100),
        "temperature_f": round(random.uniform(97.5, 99.5), 1),
        "respiratory_rate": random.randint(14, 20),
        "weight_kg": round(random.uniform(50, 95), 1),
        "height_cm": random.randint(150, 185),
    }


def generate_patient() -> Dict[str, Any]:
    """Generate a synthetic patient record."""
    gender = random.choice(["Male", "Female"])
    first_names = FIRST_NAMES_MALE if gender == "Male" else FIRST_NAMES_FEMALE
    
    age = random.randint(25, 75)
    num_conditions = random.randint(1, 4)
    num_medications = random.randint(1, 5)
    
    vitals = generate_vitals()
    
    return {
        "id": f"p-{random.randint(10000, 99999)}",
        "name": f"{random.choice(first_names)} {random.choice(LAST_NAMES)}",
        "age": age,
        "gender": gender,
        "conditions": random.sample(CONDITIONS, num_conditions),
        "medications": random.sample(MEDICATIONS, num_medications),
        "allergies": random.sample(ALLERGIES, random.randint(1, 2)),
        "vitals": vitals,
        "height_cm": vitals["height_cm"],
        "weight_kg": vitals["weight_kg"],
    }


def generate_visit_history(num_visits: int = 3) -> List[Dict[str, Any]]:
    """Generate synthetic visit history."""
    visits = []
    for i in range(num_visits):
        visits.append({
            "visit_time": f"2024-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            "summary_ai": random.choice(VISIT_SUMMARIES),
            "doctor_notes_text": random.choice(VISIT_SUMMARIES),
        })
    return visits


def generate_documents(num_docs: int = 2) -> List[Dict[str, Any]]:
    """Generate synthetic documents on file."""
    docs = random.sample(DOCUMENT_TYPES, min(num_docs, len(DOCUMENT_TYPES)))
    return [
        {
            "title": d["title"],
            "doc_type": d["type"],
            "extracted_text": d["content"],
        }
        for d in docs
    ]


def generate_intake_case() -> Dict[str, Any]:
    """Generate a complete intake summary case for GEPA training."""
    patient = generate_patient()
    complaint_data = random.choice(CHIEF_COMPLAINTS)
    visits = generate_visit_history(random.randint(1, 4))
    documents = generate_documents(random.randint(1, 3))
    
    # Build expected output (ground truth)
    expected_output = {
        "chief_complaint": complaint_data["complaint"],
        "onset": complaint_data["onset"],
        "severity": complaint_data["severity"],
        "findings": complaint_data["symptoms"] + [
            f"⚠ BP: {patient['vitals']['bp_systolic']}/{patient['vitals']['bp_diastolic']} mmHg" 
            if patient['vitals']['bp_systolic'] > 140 else None,
            f"Known: {patient['conditions'][0]}" if patient['conditions'] else None,
        ],
        "context": f"Patient with history of {', '.join(patient['conditions'][:2])}. Currently on {len(patient['medications'])} medications.",
    }
    expected_output["findings"] = [f for f in expected_output["findings"] if f]
    
    return {
        "input": {
            "patient": patient,
            "visits": visits,
            "documents": documents,
            "appointment_reason": complaint_data["complaint"],
        },
        "expected_output": expected_output,
        "metadata": {
            "case_type": "intake_summary",
            "complexity": "medium" if len(patient["conditions"]) > 2 else "simple",
        }
    }


def generate_consult_case() -> Dict[str, Any]:
    """Generate a consultation analysis case for GEPA training."""
    patient = generate_patient()
    complaint_data = random.choice(CHIEF_COMPLAINTS)
    
    # Generate a synthetic transcript
    transcript = f"""
Doctor: Good morning, {patient['name'].split()[0]}. How are you feeling today?
Patient: Good morning, doctor. I've been having {complaint_data['complaint']}.
Doctor: I see. When did this start?
Patient: It started {complaint_data['onset'].lower()}.
Doctor: How would you rate the severity on a scale of 1 to 10?
Patient: I'd say about {complaint_data['severity'].split('/')[0]}.
Doctor: Are you taking your regular medications?
Patient: Yes, I'm taking {patient['medications'][0] if patient['medications'] else 'my usual medicines'}.
Doctor: Any allergies I should know about?
Patient: I'm allergic to {patient['allergies'][0] if patient['allergies'][0] != 'None known' else 'nothing that I know of'}.
Doctor: Let me examine you. Your blood pressure is {patient['vitals']['bp_systolic']}/{patient['vitals']['bp_diastolic']}.
Doctor: Based on my examination, I recommend we do some tests and adjust your treatment.
Patient: Thank you, doctor.
"""
    
    expected_output = {
        "soap": {
            "subjective": f"Patient presents with {complaint_data['complaint']}. Onset: {complaint_data['onset']}. Severity: {complaint_data['severity']}. Currently on {patient['medications'][0] if patient['medications'] else 'no medications'}.",
            "objective": f"BP: {patient['vitals']['bp_systolic']}/{patient['vitals']['bp_diastolic']} mmHg, HR: {patient['vitals']['heart_rate']} bpm, SpO2: {patient['vitals']['spo2']}%",
            "assessment": f"Patient with {patient['conditions'][0] if patient['conditions'] else 'presenting complaint'} presenting with {complaint_data['symptoms'][0]}",
            "plan": "1. Laboratory investigations as indicated\n2. Continue current medications\n3. Follow-up in 2 weeks",
        },
        "extracted_facts": {
            "symptoms": complaint_data["symptoms"],
            "duration": complaint_data["onset"],
            "medications_discussed": patient["medications"][:2] if patient["medications"] else [],
            "allergies_mentioned": [a for a in patient["allergies"] if a != "None known"],
        }
    }
    
    return {
        "input": {
            "patient": patient,
            "transcript": transcript,
        },
        "expected_output": expected_output,
        "metadata": {
            "case_type": "consult_analysis",
            "complexity": "medium",
        }
    }


def generate_qa_case() -> Dict[str, Any]:
    """Generate a patient Q&A case for GEPA training."""
    patient = generate_patient()
    visits = generate_visit_history(random.randint(2, 5))
    documents = generate_documents(random.randint(2, 4))
    
    # Generate Q&A pairs
    qa_pairs = [
        {
            "question": f"What are {patient['name'].split()[0]}'s current medications?",
            "expected_answer": f"The patient is currently on: {', '.join(patient['medications'])}",
        },
        {
            "question": f"Does this patient have any allergies?",
            "expected_answer": f"Allergies: {', '.join(patient['allergies'])}",
        },
        {
            "question": f"What are the known medical conditions?",
            "expected_answer": f"Known conditions: {', '.join(patient['conditions'])}",
        },
        {
            "question": f"What was the last blood pressure reading?",
            "expected_answer": f"Latest BP: {patient['vitals']['bp_systolic']}/{patient['vitals']['bp_diastolic']} mmHg",
        },
    ]
    
    selected_qa = random.choice(qa_pairs)
    
    return {
        "input": {
            "patient": patient,
            "visits": visits,
            "documents": documents,
            "question": selected_qa["question"],
        },
        "expected_output": {
            "answer": selected_qa["expected_answer"],
        },
        "metadata": {
            "case_type": "patient_qa",
            "complexity": "simple",
        }
    }


def generate_training_batch(
    case_type: str = "intake_summary",
    num_cases: int = 20
) -> List[Dict[str, Any]]:
    """Generate a batch of training cases."""
    generators = {
        "intake_summary": generate_intake_case,
        "consult_analysis": generate_consult_case,
        "patient_qa": generate_qa_case,
    }
    
    generator = generators.get(case_type, generate_intake_case)
    return [generator() for _ in range(num_cases)]
