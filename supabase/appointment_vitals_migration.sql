-- Migration: Add vitals to appointments table
-- Run this on Supabase SQL Editor

-- ============================
-- STEP 1: Add vitals column to appointments
-- ============================

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS vitals JSONB DEFAULT NULL;

-- ============================
-- STEP 2: Add appointment_id to ai_intake_summaries
-- ============================

ALTER TABLE ai_intake_summaries 
ADD COLUMN IF NOT EXISTS appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_intake_summaries_appointment ON ai_intake_summaries(appointment_id);

-- ============================
-- STEP 3: Add appointment_id to differential_diagnoses
-- ============================

ALTER TABLE differential_diagnoses 
ADD COLUMN IF NOT EXISTS appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_differential_diagnoses_appointment ON differential_diagnoses(appointment_id);

-- ============================
-- STEP 4: Migrate existing patient vitals to their scheduled appointments
-- ============================

UPDATE appointments a
SET vitals = p.vitals
FROM patients p
WHERE a.patient_id = p.id
AND a.vitals IS NULL
AND p.vitals IS NOT NULL;

-- ============================
-- STEP 5: Link existing intake summaries to appointments (best effort)
-- ============================

-- For patients with one scheduled appointment, link their intake summary
UPDATE ai_intake_summaries ais
SET appointment_id = (
    SELECT a.id 
    FROM appointments a 
    WHERE a.patient_id = ais.patient_id 
    AND a.status = 'scheduled'
    LIMIT 1
)
WHERE ais.appointment_id IS NULL;

-- Same for differential diagnoses
UPDATE differential_diagnoses dd
SET appointment_id = (
    SELECT a.id 
    FROM appointments a 
    WHERE a.patient_id = dd.patient_id 
    AND a.status = 'scheduled'
    LIMIT 1
)
WHERE dd.appointment_id IS NULL;

-- Done!
SELECT 'Migration complete! Vitals and AI data now linked to appointments.' as status;
