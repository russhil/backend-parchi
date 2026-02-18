-- Migration: Add doctor_id to patients table for doctor-level data isolation
-- Run this on Supabase SQL Editor BEFORE deploying the updated backend

-- 1. Add doctor_id column to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS doctor_id TEXT;

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_patients_doctor_id ON patients(doctor_id);

-- 3. Backfill existing patients with a default doctor if one exists
-- (Adjust 'dr-default' to match your actual default doctor ID)
-- UPDATE patients SET doctor_id = 'dr-default' WHERE doctor_id IS NULL;
