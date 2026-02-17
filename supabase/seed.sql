-- Parchi.ai — Supabase Schema + Comprehensive Seed Data
-- Run this in Supabase SQL Editor to set up the database

-- Drop existing tables if they exist (for clean reset)
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS consult_sessions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS report_insights CASCADE;
DROP TABLE IF EXISTS differential_diagnoses CASCADE;
DROP TABLE IF EXISTS ai_intake_summaries CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- ============================
-- CORE TABLES
-- ============================

CREATE TABLE patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    allergies TEXT[] DEFAULT '{}',
    medications TEXT[] DEFAULT '{}',
    conditions TEXT[] DEFAULT '{}',
    vitals JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'scheduled',  -- scheduled, in-progress, completed, cancelled
    reason TEXT,
    vitals JSONB,  -- Vitals captured at appointment time
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE visits (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    visit_time TIMESTAMPTZ NOT NULL,
    doctor_notes_text TEXT,
    summary_ai TEXT,
    soap_ai JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    doc_type TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    extracted_text TEXT,
    file_url TEXT
);

CREATE TABLE consult_sessions (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    transcript_text TEXT,
    soap_note JSONB,
    insights_json JSONB
);

-- ============================
-- AI & ANALYTICS TABLES
-- ============================

CREATE TABLE ai_intake_summaries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
    chief_complaint TEXT,
    onset TEXT,
    severity TEXT,
    findings TEXT[] DEFAULT '{}',
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE differential_diagnoses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
    condition TEXT,
    match_pct INTEGER,
    reasoning TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE report_insights (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    summary TEXT,
    flags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- ACTION TABLES
-- ============================

CREATE TABLE prescriptions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    medications JSONB NOT NULL, -- Array of {name, dosage, frequency, duration, instructions}
    diagnosis TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    note_type TEXT DEFAULT 'general', -- general, soap, follow-up
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- INDEXES
-- ============================

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_time ON appointments(start_time);
CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_documents_patient ON documents(patient_id);
CREATE INDEX idx_consults_patient ON consult_sessions(patient_id);

-- ============================
-- SEED DATA: 10 Patients
-- ============================

-- Patient 1: Sarah Jenkins (original demo patient)
INSERT INTO patients (id, name, age, gender, phone, email, address, height_cm, weight_kg, allergies, medications, conditions, vitals)
VALUES (
    'p1',
    'Sarah Jenkins',
    34,
    'Female',
    '+91 98765 43210',
    'sarah.jenkins@email.com',
    '42 MG Road, Bengaluru, Karnataka',
    165,
    62,
    ARRAY['Penicillin', 'Dust mites'],
    ARRAY['Levothyroxine 50mcg daily', 'Salbutamol inhaler PRN'],
    ARRAY['Mild Asthma', 'Hypothyroidism'],
    '{"bp_systolic": 120, "bp_diastolic": 80, "spo2": 98, "heart_rate": 72, "temperature_f": 98.6, "recorded_at": "2026-02-09T08:00:00Z"}'::jsonb
);

-- Patient 2: Rajesh Kumar (Diabetic patient)
INSERT INTO patients (id, name, age, gender, phone, email, address, height_cm, weight_kg, allergies, medications, conditions, vitals)
VALUES (
    'p2',
    'Rajesh Kumar',
    52,
    'Male',
    '+91 98123 45678',
    'rajesh.kumar@email.com',
    '15 Jayanagar 4th Block, Bengaluru, Karnataka',
    172,
    85,
    ARRAY['Sulfa drugs'],
    ARRAY['Metformin 500mg BD', 'Glimepiride 2mg OD', 'Atorvastatin 10mg HS'],
    ARRAY['Type 2 Diabetes', 'Hyperlipidemia', 'Hypertension'],
    '{"bp_systolic": 142, "bp_diastolic": 88, "spo2": 97, "heart_rate": 78, "temperature_f": 98.4, "recorded_at": "2026-02-09T08:30:00Z"}'::jsonb
);

-- Patient 3: Priya Sharma (Cardiac patient)
INSERT INTO patients (id, name, age, gender, phone, email, address, height_cm, weight_kg, allergies, medications, conditions, vitals)
VALUES (
    'p3',
    'Priya Sharma',
    48,
    'Female',
    '+91 99876 54321',
    'priya.sharma@email.com',
    '78 Indiranagar, Bengaluru, Karnataka',
    158,
    68,
    ARRAY['Aspirin', 'Shellfish'],
    ARRAY['Clopidogrel 75mg OD', 'Metoprolol 50mg BD', 'Rosuvastatin 20mg HS', 'Ramipril 5mg OD'],
    ARRAY['Coronary Artery Disease', 'Post-PTCA', 'Hypertension'],
    '{"bp_systolic": 128, "bp_diastolic": 78, "spo2": 98, "heart_rate": 64, "temperature_f": 98.2, "recorded_at": "2026-02-09T09:00:00Z"}'::jsonb
);

-- Patient 4: Amit Patel (Orthopedic patient)
INSERT INTO patients (id, name, age, gender, phone, email, address, height_cm, weight_kg, allergies, medications, conditions, vitals)
VALUES (
    'p4',
    'Amit Patel',
    42,
    'Male',
    '+91 98234 56789',
    'amit.patel@email.com',
    '23 HSR Layout, Bengaluru, Karnataka',
    175,
    78,
    ARRAY['NSAIDs'],
    ARRAY['Pantoprazole 40mg OD', 'Tramadol 50mg SOS', 'Calcium + Vitamin D3 OD'],
    ARRAY['Lumbar Disc Herniation', 'Chronic Back Pain', 'GERD'],
    '{"bp_systolic": 118, "bp_diastolic": 76, "spo2": 99, "heart_rate": 70, "temperature_f": 98.4, "recorded_at": "2026-02-09T09:30:00Z"}'::jsonb
);

-- Patient 5: Lakshmi Venkatesh (Geriatric patient)
INSERT INTO patients (id, name, age, gender, phone, email, address, height_cm, weight_kg, allergies, medications, conditions, vitals)
VALUES (
    'p5',
    'Lakshmi Venkatesh',
    72,
    'Female',
    '+91 94567 89012',
    'lakshmi.v@email.com',
    '56 Basavanagudi, Bengaluru, Karnataka',
    152,
    55,
    ARRAY['Codeine', 'Latex'],
    ARRAY['Amlodipine 5mg OD', 'Metformin 500mg BD', 'Donepezil 5mg HS', 'Aspirin 75mg OD', 'Vitamin B12 1500mcg weekly'],
    ARRAY['Mild Cognitive Impairment', 'Type 2 Diabetes', 'Hypertension', 'Osteoporosis'],
    '{"bp_systolic": 138, "bp_diastolic": 82, "spo2": 96, "heart_rate": 74, "temperature_f": 97.8, "recorded_at": "2026-02-09T10:00:00Z"}'::jsonb
);

-- Patient 6: Mohammed Farooq (Respiratory patient)
INSERT INTO patients (id, name, age, gender, phone, email, address, height_cm, weight_kg, allergies, medications, conditions, vitals)
VALUES (
    'p6',
    'Mohammed Farooq',
    58,
    'Male',
    '+91 98765 12345',
    'mohammed.farooq@email.com',
    '89 Shivajinagar, Bengaluru, Karnataka',
    168,
    72,
    ARRAY['Theophylline'],
    ARRAY['Budesonide/Formoterol inhaler BD', 'Tiotropium inhaler OD', 'Montelukast 10mg HS', 'Azithromycin 500mg (as needed)'],
    ARRAY['COPD', 'Chronic Bronchitis', 'Ex-smoker'],
    '{"bp_systolic": 130, "bp_diastolic": 84, "spo2": 93, "heart_rate": 82, "temperature_f": 98.8, "recorded_at": "2026-02-09T10:30:00Z"}'::jsonb
);

-- Patient 7: Anita Reddy (Thyroid + PCOS patient)
INSERT INTO patients (id, name, age, gender, phone, email, address, height_cm, weight_kg, allergies, medications, conditions, vitals)
VALUES (
    'p7',
    'Anita Reddy',
    28,
    'Female',
    '+91 99123 45678',
    'anita.reddy@email.com',
    '34 Koramangala, Bengaluru, Karnataka',
    160,
    72,
    ARRAY['Metformin (GI intolerance)'],
    ARRAY['Levothyroxine 75mcg OD', 'Myo-inositol 2g BD', 'Vitamin D3 60000 IU weekly'],
    ARRAY['Hypothyroidism', 'PCOS', 'Vitamin D Deficiency', 'Insulin Resistance'],
    '{"bp_systolic": 116, "bp_diastolic": 74, "spo2": 99, "heart_rate": 76, "temperature_f": 98.4, "recorded_at": "2026-02-09T11:00:00Z"}'::jsonb
);

-- Patient 8: Venkat Rao (Post-surgery patient)
INSERT INTO patients (id, name, age, gender, phone, email, address, height_cm, weight_kg, allergies, medications, conditions, vitals)
VALUES (
    'p8',
    'Venkat Rao',
    65,
    'Male',
    '+91 98456 78901',
    'venkat.rao@email.com',
    '12 Malleshwaram, Bengaluru, Karnataka',
    170,
    70,
    ARRAY['Morphine'],
    ARRAY['Warfarin 5mg OD', 'Pantoprazole 40mg OD', 'Paracetamol 650mg QID', 'Enoxaparin 40mg SC OD'],
    ARRAY['Post Total Knee Replacement', 'Osteoarthritis', 'Atrial Fibrillation'],
    '{"bp_systolic": 124, "bp_diastolic": 78, "spo2": 98, "heart_rate": 84, "temperature_f": 99.0, "recorded_at": "2026-02-09T11:30:00Z"}'::jsonb
);

-- Patient 9: Deepa Menon (Mental health patient)
INSERT INTO patients (id, name, age, gender, phone, email, address, height_cm, weight_kg, allergies, medications, conditions, vitals)
VALUES (
    'p9',
    'Deepa Menon',
    35,
    'Female',
    '+91 94321 09876',
    'deepa.menon@email.com',
    '67 Whitefield, Bengaluru, Karnataka',
    162,
    58,
    ARRAY['SSRIs (previous reaction)'],
    ARRAY['Bupropion 150mg OD', 'Clonazepam 0.25mg SOS', 'Melatonin 3mg HS'],
    ARRAY['Generalized Anxiety Disorder', 'Insomnia', 'Tension Headaches'],
    '{"bp_systolic": 110, "bp_diastolic": 70, "spo2": 99, "heart_rate": 68, "temperature_f": 98.2, "recorded_at": "2026-02-09T12:00:00Z"}'::jsonb
);

-- Patient 10: Suresh Iyer (Renal patient)
INSERT INTO patients (id, name, age, gender, phone, email, address, height_cm, weight_kg, allergies, medications, conditions, vitals)
VALUES (
    'p10',
    'Suresh Iyer',
    60,
    'Male',
    '+91 98567 43210',
    'suresh.iyer@email.com',
    '45 RT Nagar, Bengaluru, Karnataka',
    165,
    68,
    ARRAY['Contrast dye', 'ACE inhibitors'],
    ARRAY['Telmisartan 40mg OD', 'Furosemide 40mg OD', 'Sodium bicarbonate 650mg TID', 'Erythropoietin 4000 IU SC weekly', 'Calcium acetate with meals'],
    ARRAY['Chronic Kidney Disease Stage 3b', 'Hypertension', 'Anemia of CKD'],
    '{"bp_systolic": 136, "bp_diastolic": 86, "spo2": 97, "heart_rate": 76, "temperature_f": 98.4, "recorded_at": "2026-02-09T12:30:00Z"}'::jsonb
);

-- ============================
-- SEED DATA: Appointments
-- ============================

INSERT INTO appointments (id, patient_id, start_time, status, reason, vitals) VALUES
    ('a1', 'p1', NOW()::date + INTERVAL '9 hours 30 minutes', 'scheduled', 'Follow-up: Migraine',
     '{"bp_systolic": 120, "bp_diastolic": 80, "spo2": 98, "heart_rate": 72, "temperature_f": 98.6, "recorded_at": "2026-02-09T09:30:00Z"}'::jsonb),
    ('a2', 'p1', (NOW()::date + INTERVAL '1 day') + INTERVAL '11 hours', 'scheduled', 'Routine check', NULL),
    ('a3', 'p2', NOW()::date + INTERVAL '10 hours', 'scheduled', 'Diabetes review',
     '{"bp_systolic": 142, "bp_diastolic": 88, "spo2": 97, "heart_rate": 78, "temperature_f": 98.4, "recorded_at": "2026-02-09T10:00:00Z"}'::jsonb),
    ('a4', 'p3', NOW()::date + INTERVAL '10 hours 30 minutes', 'scheduled', 'Cardiac follow-up',
     '{"bp_systolic": 128, "bp_diastolic": 78, "spo2": 98, "heart_rate": 64, "temperature_f": 98.2, "recorded_at": "2026-02-09T10:30:00Z"}'::jsonb),
    ('a5', 'p4', NOW()::date + INTERVAL '11 hours', 'scheduled', 'Back pain review',
     '{"bp_systolic": 118, "bp_diastolic": 76, "spo2": 99, "heart_rate": 70, "temperature_f": 98.4, "recorded_at": "2026-02-09T11:00:00Z"}'::jsonb),
    ('a6', 'p5', NOW()::date + INTERVAL '14 hours', 'scheduled', 'Memory assessment',
     '{"bp_systolic": 138, "bp_diastolic": 82, "spo2": 96, "heart_rate": 74, "temperature_f": 97.8, "recorded_at": "2026-02-09T14:00:00Z"}'::jsonb),
    ('a7', 'p6', NOW()::date + INTERVAL '14 hours 30 minutes', 'scheduled', 'COPD check',
     '{"bp_systolic": 130, "bp_diastolic": 84, "spo2": 93, "heart_rate": 82, "temperature_f": 98.8, "recorded_at": "2026-02-09T14:30:00Z"}'::jsonb),
    ('a8', 'p7', (NOW()::date + INTERVAL '1 day') + INTERVAL '10 hours', 'scheduled', 'Thyroid + PCOS', NULL),
    ('a9', 'p8', NOW()::date + INTERVAL '15 hours', 'scheduled', 'Post-op check',
     '{"bp_systolic": 124, "bp_diastolic": 78, "spo2": 98, "heart_rate": 84, "temperature_f": 99.0, "recorded_at": "2026-02-09T15:00:00Z"}'::jsonb),
    ('a10', 'p9', (NOW()::date + INTERVAL '1 day') + INTERVAL '15 hours', 'scheduled', 'Anxiety follow-up', NULL),
    ('a11', 'p10', NOW()::date + INTERVAL '16 hours', 'scheduled', 'CKD labs review',
     '{"bp_systolic": 136, "bp_diastolic": 86, "spo2": 97, "heart_rate": 76, "temperature_f": 98.4, "recorded_at": "2026-02-09T16:00:00Z"}'::jsonb);

-- ============================
-- SEED DATA: Visits (Past)
-- ============================

INSERT INTO visits (id, patient_id, visit_time, doctor_notes_text, summary_ai, soap_ai) VALUES
-- Sarah Jenkins visits
('v1', 'p1', NOW() - INTERVAL '14 days',
 'Patient reports recurring migraines over the past 3 weeks. Onset typically in the afternoon, 6/10 severity, throbbing quality, right-sided. Associated with nausea but no visual aura. No recent head trauma. Sleep pattern disrupted — averaging 5 hours/night due to work stress. Advised to maintain headache diary, improve sleep hygiene. Prescribed Sumatriptan 50mg PRN.',
 'Recurring migraines (3 weeks), right-sided, throbbing, 6/10 severity. Associated nausea, no aura. Likely tension-type/migraine overlap exacerbated by poor sleep and work stress. Started Sumatriptan PRN.',
 '{"subjective": "Patient reports recurring headaches over 3 weeks, right-sided, throbbing, 6/10 severity. Associated nausea, no aura. Poor sleep (~5hrs/night). Work stress increased.", "objective": "BP 118/76, HR 70, alert and oriented. No papilledema. Cranial nerves intact. Neck supple, no meningeal signs.", "assessment": "Migraine without aura, likely exacerbated by sleep deprivation and stress. Differential includes tension-type headache.", "plan": "1. Sumatriptan 50mg PRN for acute episodes\n2. Sleep hygiene counseling\n3. Headache diary for 2 weeks\n4. Follow-up in 2 weeks\n5. Consider prophylaxis if frequency >4/month"}'::jsonb),

('v2', 'p1', NOW() - INTERVAL '60 days',
 'Routine thyroid follow-up. Patient compliant with Levothyroxine 50mcg. No symptoms of hypo/hyperthyroidism. Energy levels stable. Weight stable at 62kg. TSH levels reviewed — within normal range.',
 'Routine thyroid follow-up. Levothyroxine 50mcg continued. TSH within normal limits. No symptoms. Stable.',
 '{"subjective": "No complaints. Energy levels good. Compliant with medication.", "objective": "Weight 62kg (stable). Thyroid non-tender, no nodules palpable. TSH 2.4 mIU/L (normal).", "assessment": "Hypothyroidism — well-controlled on current dose.", "plan": "1. Continue Levothyroxine 50mcg daily\n2. Repeat TSH in 6 months\n3. Routine follow-up"}'::jsonb),

-- Rajesh Kumar visits
('v3', 'p2', NOW() - INTERVAL '30 days',
 'Quarterly diabetes review. Patient reports good compliance with medications. Occasional hypoglycemia episodes in the morning. Recent HbA1c 7.8% (target <7%). Fundoscopy: early diabetic retinopathy noted. Foot exam: no ulcers, pulses present.',
 'Quarterly diabetes review. HbA1c 7.8%. Early diabetic retinopathy detected. Morning hypoglycemia episodes noted. Adjusted Glimepiride timing.',
 '{"subjective": "Good medication compliance. Occasional morning hypoglycemia. No polyuria/polydipsia. Vision unchanged.", "objective": "BP 140/86, Weight 85kg. HbA1c 7.8%. Fundoscopy: early nonproliferative diabetic retinopathy. Foot exam normal.", "assessment": "Type 2 DM with suboptimal control. Early NPDR. Hypertension not at target.", "plan": "1. Continue Metformin 500mg BD\n2. Reduce Glimepiride to 1mg OD (hypoglycemia)\n3. Add Telmisartan 40mg for BP\n4. Ophthalmology referral for retinopathy\n5. Repeat HbA1c in 3 months"}'::jsonb),

-- Priya Sharma visits
('v4', 'p3', NOW() - INTERVAL '21 days',
 'Cardiac follow-up post-PTCA (6 months). Patient asymptomatic. No chest pain, dyspnea, or palpitations. Good exercise tolerance — walks 2km daily. Lipid panel: LDL 78 mg/dL (on target). ECG: normal sinus rhythm.',
 'Post-PTCA 6-month follow-up. Asymptomatic, good exercise tolerance. LDL at target. Continue current medications.',
 '{"subjective": "No chest pain, dyspnea, or palpitations. Walks 2km daily without symptoms. Compliant with medications.", "objective": "BP 126/78, HR 64 regular. Heart sounds normal, no murmurs. ECG: NSR. LDL 78 mg/dL.", "assessment": "Post-PTCA — excellent recovery. CAD well-controlled on current regimen.", "plan": "1. Continue all cardiac medications\n2. Annual stress test\n3. Repeat lipid panel in 6 months\n4. Maintain lifestyle modifications"}'::jsonb);

-- ============================
-- SEED DATA: Documents
-- ============================

INSERT INTO documents (id, patient_id, title, doc_type, uploaded_at, extracted_text) VALUES
-- Sarah Jenkins documents
('d1', 'p1', 'Complete Blood Count (CBC)', 'lab_report', NOW() - INTERVAL '10 days',
 'CBC Report — Sarah Jenkins, 34F
Date: ' || to_char(NOW() - INTERVAL '10 days', 'DD Mon YYYY') || '

WBC: 7.2 x10³/µL (Normal: 4.5-11.0)
RBC: 4.5 x10⁶/µL (Normal: 4.0-5.5)
Hemoglobin: 13.1 g/dL (Normal: 12.0-16.0)
Hematocrit: 39.2% (Normal: 36-46%)
Platelets: 245 x10³/µL (Normal: 150-400)
ESR: 12 mm/hr (Normal: 0-20)

⚠ CRP: 8.2 mg/L (Normal: <3.0) — ELEVATED

Impression: Mildly elevated CRP suggesting low-grade inflammation. All other parameters within normal limits.'),

('d2', 'p1', 'Thyroid Panel', 'lab_report', NOW() - INTERVAL '60 days',
 'Thyroid Function Test — Sarah Jenkins, 34F
Date: ' || to_char(NOW() - INTERVAL '60 days', 'DD Mon YYYY') || '

TSH: 2.4 mIU/L (Normal: 0.4-4.0)
Free T4: 1.1 ng/dL (Normal: 0.8-1.8)
Free T3: 3.2 pg/mL (Normal: 2.3-4.2)

Impression: Thyroid function within normal limits on Levothyroxine 50mcg. No dose adjustment needed.'),

('d3', 'p1', 'MRI Brain — Referral Letter', 'referral', NOW() - INTERVAL '7 days',
 'Referral for MRI Brain — Sarah Jenkins, 34F

Referring Physician: YC
Indication: Recurring migraines (3+ weeks), right-sided, to rule out structural pathology.
Clinical Notes: No focal neurological deficits. No papilledema. Migraines not responding fully to Sumatriptan.

Please schedule MRI Brain with contrast at earliest convenience.'),

-- Rajesh Kumar documents
('d4', 'p2', 'HbA1c Report', 'lab_report', NOW() - INTERVAL '30 days',
 'HbA1c Report — Rajesh Kumar, 52M
Date: ' || to_char(NOW() - INTERVAL '30 days', 'DD Mon YYYY') || '

HbA1c: 7.8% (Target: <7.0%)
Fasting Glucose: 142 mg/dL
Post-prandial Glucose: 198 mg/dL

⚠ Suboptimal glycemic control. Recommend lifestyle modifications and medication review.'),

('d5', 'p2', 'Lipid Panel', 'lab_report', NOW() - INTERVAL '30 days',
 'Lipid Panel — Rajesh Kumar, 52M
Date: ' || to_char(NOW() - INTERVAL '30 days', 'DD Mon YYYY') || '

Total Cholesterol: 198 mg/dL
LDL: 112 mg/dL (Target: <100 for diabetics)
HDL: 42 mg/dL (Low)
Triglycerides: 220 mg/dL (High)

Impression: Mixed dyslipidemia. Continue statin, consider adding fibrate if TG remains elevated.'),

-- Priya Sharma documents
('d6', 'p3', 'ECG Report', 'diagnostic', NOW() - INTERVAL '21 days',
 'ECG Report — Priya Sharma, 48F
Date: ' || to_char(NOW() - INTERVAL '21 days', 'DD Mon YYYY') || '

Rhythm: Normal Sinus Rhythm
Rate: 64 bpm
PR Interval: 160 ms (Normal)
QRS Duration: 88 ms (Normal)
QTc: 420 ms (Normal)
Axis: Normal
ST-T Changes: None

Impression: Normal ECG. No ischemic changes.'),

('d7', 'p3', 'Lipid Panel Post-PTCA', 'lab_report', NOW() - INTERVAL '21 days',
 'Lipid Panel — Priya Sharma, 48F
Date: ' || to_char(NOW() - INTERVAL '21 days', 'DD Mon YYYY') || '

Total Cholesterol: 152 mg/dL (Excellent)
LDL: 78 mg/dL (Target: <70 for CAD — close to target)
HDL: 52 mg/dL (Good)
Triglycerides: 110 mg/dL (Normal)

Impression: Lipid profile well-controlled on Rosuvastatin 20mg. Consider dose increase if LDL >70 persists.');

-- ============================
-- SEED DATA: AI Intake Summaries
-- ============================

INSERT INTO ai_intake_summaries (patient_id, appointment_id, chief_complaint, onset, severity, findings, context) VALUES
('p1', 'a1', 'Recurring migraines — follow-up visit', '3 weeks ago, worsening over past week', '6/10, occasionally reaching 8/10',
 ARRAY[
     'Right-sided throbbing headache, primarily afternoon onset',
     'Associated nausea, no visual aura or photophobia',
     'Poor sleep pattern (~5 hrs/night) linked to work stress',
     'Sumatriptan 50mg provides partial relief (onset 45 min)',
     'No recent head trauma or neurological deficits',
     '⚠ CRP elevated at 8.2 mg/L — may indicate underlying inflammation'
 ],
 'Patient has known history of mild asthma and hypothyroidism (well-controlled). Currently on Levothyroxine 50mcg and Salbutamol PRN. MRI Brain referral pending.'),

('p2', 'a3', 'Diabetes review — HbA1c results', 'Chronic condition, 8 years', 'Moderate — occasional hypoglycemia',
 ARRAY[
     'HbA1c 7.8% (target <7%) — suboptimal control',
     'Morning hypoglycemia episodes reported',
     '⚠ Early diabetic retinopathy detected on fundoscopy',
     'BP 142/88 — hypertension not at target',
     'LDL 112 mg/dL — above target for diabetics',
     'Weight stable at 85kg, BMI 28.7 (overweight)'
 ],
 'Long-standing Type 2 DM with complications developing. Needs aggressive risk factor management. Ophthalmology referral pending.'),

('p3', 'a4', 'Cardiac follow-up — 6 months post-PTCA', 'Post-procedure', 'Asymptomatic',
 ARRAY[
     'No chest pain, dyspnea, or palpitations',
     'Good exercise tolerance — walks 2km daily',
     'LDL 78 mg/dL — close to target (<70 for CAD)',
     'BP well-controlled on current regimen',
     'ECG: Normal sinus rhythm, no ischemic changes',
     'Compliant with dual antiplatelet therapy'
 ],
 'Post-PTCA for CAD. Excellent recovery. Continue secondary prevention. Annual stress test due.');

-- ============================
-- SEED DATA: Differential Diagnoses
-- ============================

INSERT INTO differential_diagnoses (patient_id, appointment_id, condition, match_pct, reasoning) VALUES
('p1', 'a1', 'Migraine without Aura', 82, 'Throbbing, unilateral, with nausea. Classic pattern.'),
('p1', 'a1', 'Tension-type Headache', 65, 'Stress and sleep deprivation are major triggers.'),
('p1', 'a1', 'Medication Overuse Headache', 30, 'Monitor Sumatriptan frequency — risk if >10 days/month.'),
('p1', 'a1', 'Secondary Headache', 15, 'Low probability. No red flags. MRI pending to rule out.'),

('p2', 'a3', 'Type 2 DM with Retinopathy', 95, 'Confirmed diagnosis with early NPDR on fundoscopy.'),
('p2', 'a3', 'Metabolic Syndrome', 85, 'Meets criteria: DM + HTN + dyslipidemia + obesity.'),
('p2', 'a3', 'Hypoglycemia - Drug-induced', 70, 'Morning hypoglycemia likely due to Glimepiride.'),

('p3', 'a4', 'Stable CAD post-PTCA', 90, 'Asymptomatic, good exercise tolerance, no ischemic changes.'),
('p3', 'a4', 'In-stent Restenosis', 10, 'Low risk — asymptomatic, but needs monitoring.');

-- ============================
-- SEED DATA: Report Insights
-- ============================

INSERT INTO report_insights (patient_id, summary, flags) VALUES
('p1', '3 documents on file. Key finding: elevated CRP (8.2 mg/L) in recent CBC may correlate with migraine inflammation pathway. Thyroid panel normal — no dose adjustment needed. MRI referral submitted, pending scheduling.',
 '[{"type": "warning", "text": "CRP 8.2 mg/L (elevated) — consider inflammatory workup if migraines persist"}, {"type": "info", "text": "TSH 2.4 mIU/L — well-controlled, next check in 6 months"}, {"type": "info", "text": "MRI Brain referral pending — follow up on scheduling"}]'::jsonb),

('p2', '2 lab reports on file. HbA1c 7.8% indicates suboptimal diabetes control. Lipid panel shows mixed dyslipidemia with high triglycerides. Early retinopathy detected requires ophthalmology follow-up.',
 '[{"type": "warning", "text": "HbA1c 7.8% — above target, needs intensification"}, {"type": "warning", "text": "Early diabetic retinopathy — ophthalmology referral urgent"}, {"type": "warning", "text": "LDL 112 mg/dL — above target for diabetics"}, {"type": "info", "text": "Consider adding fibrate for triglycerides"}]'::jsonb),

('p3', '2 documents on file. Post-PTCA follow-up shows excellent recovery. ECG normal, lipid profile near target. Continue current secondary prevention regimen.',
 '[{"type": "info", "text": "LDL 78 mg/dL — close to target (<70), consider Rosuvastatin dose increase"}, {"type": "info", "text": "ECG: Normal sinus rhythm, no ischemic changes"}, {"type": "info", "text": "Annual stress test due"}]'::jsonb);

-- Done!
SELECT 'Database seeded successfully with 10 patients, appointments, visits, and documents!' as status;
