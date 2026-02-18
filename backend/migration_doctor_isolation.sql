-- ============================================================
-- Doctor-Level Isolation Migration
-- Adds doctor_id to appointments and intake_tokens for per-doctor data isolation.
-- Run this in the Supabase SQL Editor AFTER migration_multi_clinic.sql.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================

-- 1. Add doctor_id to appointments table (no FK constraint — avoids issues with missing doctor rows)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);

-- 2. Add doctor_id to intake_tokens table
ALTER TABLE intake_tokens ADD COLUMN IF NOT EXISTS doctor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_intake_tokens_doctor_id ON intake_tokens(doctor_id);

-- 3. Backfill doctor_id only if dr-default exists in doctors table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM doctors WHERE id = 'dr-default') THEN
        UPDATE appointments SET doctor_id = 'dr-default' WHERE doctor_id IS NULL;
        UPDATE intake_tokens SET doctor_id = 'dr-default' WHERE doctor_id IS NULL;
    END IF;
END $$;

-- ============================================================
-- Clear all patient data (user requested clean slate)
-- Deletes in dependency order to avoid FK violations
-- ============================================================

-- Clear dependent tables first
DELETE FROM clinical_dumps;
DELETE FROM ai_intake_summaries;
DELETE FROM differential_diagnoses;
DELETE FROM report_insights;
DELETE FROM prescriptions;
DELETE FROM notes;
DELETE FROM documents;
DELETE FROM consult_sessions;
DELETE FROM visits;
DELETE FROM intake_tokens;
DELETE FROM appointments;
DELETE FROM patients;
