-- ============================================================
-- FULL RESET & SEED SCRIPT
-- WARNING: THIS WILL DELETE ALL EXISTING DATA
-- Run this in Supabase SQL Editor to start fresh.
-- ============================================================

-- 1. DROP ALL TABLES (Cascade)
DROP TABLE IF EXISTS clinical_dumps CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS report_insights CASCADE;
DROP TABLE IF EXISTS differential_diagnoses CASCADE;
DROP TABLE IF EXISTS ai_intake_summaries CASCADE;
DROP TABLE IF EXISTS consult_sessions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS intake_tokens CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;

-- 2. RECREATE TABLES

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clinics
CREATE TABLE clinics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctors
CREATE TABLE doctors (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'doctor',
    specialization TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Storing hash (bcrypt)
    clinic_id TEXT REFERENCES clinics(id) ON DELETE SET NULL,
    doctor_id TEXT REFERENCES doctors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients
CREATE TABLE patients (
    id TEXT PRIMARY KEY,
    clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    conditions TEXT[],
    medications TEXT[],
    allergies TEXT[],
    vitals JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'scheduled',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visits
CREATE TABLE visits (
    id TEXT PRIMARY KEY,
    clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    visit_time TIMESTAMPTZ NOT NULL,
    summary_ai TEXT,
    doctor_notes_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    doc_type TEXT DEFAULT 'general',
    extracted_text TEXT,
    file_url TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consult Sessions
CREATE TABLE consult_sessions (
    id TEXT PRIMARY KEY,
    clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    transcript_text TEXT,
    soap_note JSONB,
    insights_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Intake Summaries
CREATE TABLE ai_intake_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id TEXT, -- Optional link
    summary_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Differential Diagnoses
CREATE TABLE differential_diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id TEXT, -- Optional link
    condition_name TEXT,
    match_pct INTEGER,
    rationale TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report Insights
CREATE TABLE report_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    insight_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescriptions
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    medications JSONB DEFAULT '[]'::jsonb,
    diagnosis TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    content TEXT,
    note_type TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical Dumps
CREATE TABLE clinical_dumps (
    id TEXT PRIMARY KEY,
    clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id TEXT,
    manual_notes TEXT,
    combined_dump TEXT,
    transcript_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intake Tokens
CREATE TABLE intake_tokens (
    token TEXT PRIMARY KEY,
    clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE,
    appointment_id TEXT,
    patient_id TEXT,
    phone TEXT,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_doctors_clinic_id ON doctors(clinic_id);
CREATE INDEX idx_users_clinic_id ON users(clinic_id);
CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX idx_visits_clinic_id ON visits(clinic_id);

-- ============================================================
-- 3. SEED DATA
-- ============================================================

-- Clinic A: "Apollo Clinic" (ID: cl-apollo)
INSERT INTO clinics (id, name, slug) VALUES 
('cl-apollo', 'Apollo Clinic', 'apollo');

-- Clinic B: "Max Health" (ID: cl-max)
INSERT INTO clinics (id, name, slug) VALUES 
('cl-max', 'Max Health', 'max');

-- Doctor A: "Dr. Smith" (ID: dr-smith) -> Apollo
INSERT INTO doctors (id, clinic_id, name, role) VALUES 
('dr-smith', 'cl-apollo', 'Dr. Smith', 'owner');

-- Doctor B: "Dr. Jones" (ID: dr-jones) -> Max
INSERT INTO doctors (id, clinic_id, name, role) VALUES 
('dr-jones', 'cl-max', 'Dr. Jones', 'owner');

-- Users
-- Password for all is "password" (hashed with bcrypt)
-- Hash: $2b$12$zJhKwHejqDBKH4TBlUHxuO1GwL9OvwYNwvQHR1McQ8KQH0f6gjJ0O
INSERT INTO users (username, password_hash, clinic_id, doctor_id) VALUES 
('smith', '$2b$12$zJhKwHejqDBKH4TBlUHxuO1GwL9OvwYNwvQHR1McQ8KQH0f6gjJ0O', 'cl-apollo', 'dr-smith'),
('jones', '$2b$12$zJhKwHejqDBKH4TBlUHxuO1GwL9OvwYNwvQHR1McQ8KQH0f6gjJ0O', 'cl-max', 'dr-jones');

-- Patients for Apollo
INSERT INTO patients (id, clinic_id, name, age, gender, phone, conditions) VALUES 
('p-apollo-1', 'cl-apollo', 'Alice Apollo', 30, 'Female', '555-0101', ARRAY['Hypertension']),
('p-apollo-2', 'cl-apollo', 'Bob Apollo', 45, 'Male', '555-0102', ARRAY['Diabetes']);

-- Patients for Max
INSERT INTO patients (id, clinic_id, name, age, gender, phone, conditions) VALUES 
('p-max-1', 'cl-max', 'Charlie Max', 28, 'Male', '555-0201', ARRAY['Asthma']),
('p-max-2', 'cl-max', 'Dana Max', 50, 'Female', '555-0202', ARRAY['Arthritis']);

-- Appointments for Apollo
INSERT INTO appointments (id, clinic_id, patient_id, start_time, reason, status) VALUES 
('a-apollo-1', 'cl-apollo', 'p-apollo-1', NOW() + INTERVAL '1 day', 'Routine Checkup', 'scheduled');

-- Appointments for Max
INSERT INTO appointments (id, clinic_id, patient_id, start_time, reason, status) VALUES 
('a-max-1', 'cl-max', 'p-max-1', NOW() + INTERVAL '2 day', 'Follow-up', 'scheduled');
