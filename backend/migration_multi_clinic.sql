-- ============================================================
-- Multi-Clinic Architecture Migration
-- Run this in the Supabase SQL Editor BEFORE deploying the new backend.
-- This migration is safe to run multiple times (uses IF NOT EXISTS/IF EXISTS).
-- ============================================================

-- 1. Create clinics table
CREATE TABLE IF NOT EXISTS clinics (
    id TEXT PRIMARY KEY DEFAULT 'cl-' || substr(md5(random()::text), 1, 8),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,  -- URL-friendly identifier
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY DEFAULT 'dr-' || substr(md5(random()::text), 1, 8),
    clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'doctor',  -- owner, doctor, receptionist
    specialization TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_clinic_id ON doctors(clinic_id);

-- 3. Add clinic_id and doctor_id to users table
-- (users table is assumed to already exist with id, username, password_hash)
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_id TEXT REFERENCES doctors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);

-- 4. Add clinic_id to all existing tables
ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE consult_sessions ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE ai_intake_summaries ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE differential_diagnoses ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE report_insights ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE intake_tokens ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE;

-- clinical_dumps table (may or may not exist already)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinical_dumps') THEN
        EXECUTE 'ALTER TABLE clinical_dumps ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id) ON DELETE CASCADE';
    END IF;
END $$;

-- 5. Create indexes on clinic_id for all tables
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_visits_clinic_id ON visits(clinic_id);
CREATE INDEX IF NOT EXISTS idx_documents_clinic_id ON documents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_consult_sessions_clinic_id ON consult_sessions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_intake_summaries_clinic_id ON ai_intake_summaries(clinic_id);
CREATE INDEX IF NOT EXISTS idx_differential_diagnoses_clinic_id ON differential_diagnoses(clinic_id);
CREATE INDEX IF NOT EXISTS idx_report_insights_clinic_id ON report_insights(clinic_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_clinic_id ON prescriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_notes_clinic_id ON notes(clinic_id);
CREATE INDEX IF NOT EXISTS idx_intake_tokens_clinic_id ON intake_tokens(clinic_id);

-- 6. Insert a default clinic for existing data
INSERT INTO clinics (id, name, slug)
VALUES ('cl-default', 'Default Clinic', 'default')
ON CONFLICT (id) DO NOTHING;

-- 7. Assign all existing data to the default clinic
UPDATE patients SET clinic_id = 'cl-default' WHERE clinic_id IS NULL;
UPDATE appointments SET clinic_id = 'cl-default' WHERE clinic_id IS NULL;
UPDATE visits SET clinic_id = 'cl-default' WHERE clinic_id IS NULL;
UPDATE documents SET clinic_id = 'cl-default' WHERE clinic_id IS NULL;
UPDATE consult_sessions SET clinic_id = 'cl-default' WHERE clinic_id IS NULL;
UPDATE ai_intake_summaries SET clinic_id = 'cl-default' WHERE clinic_id IS NULL;
UPDATE differential_diagnoses SET clinic_id = 'cl-default' WHERE clinic_id IS NULL;
UPDATE report_insights SET clinic_id = 'cl-default' WHERE clinic_id IS NULL;
UPDATE prescriptions SET clinic_id = 'cl-default' WHERE clinic_id IS NULL;
UPDATE notes SET clinic_id = 'cl-default' WHERE clinic_id IS NULL;
UPDATE intake_tokens SET clinic_id = 'cl-default' WHERE clinic_id IS NULL;
UPDATE users SET clinic_id = 'cl-default' WHERE clinic_id IS NULL;

-- Update clinical_dumps if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinical_dumps') THEN
        EXECUTE 'UPDATE clinical_dumps SET clinic_id = ''cl-default'' WHERE clinic_id IS NULL';
    END IF;
END $$;

-- 8. Insert a default doctor linked to the default clinic
INSERT INTO doctors (id, clinic_id, name, role)
VALUES ('dr-default', 'cl-default', 'Doctor', 'owner')
ON CONFLICT (id) DO NOTHING;

-- Link existing users to the default doctor
UPDATE users SET doctor_id = 'dr-default' WHERE doctor_id IS NULL;
