-- Supabase Migration: Add missing columns to patients table
-- Run this in the Supabase SQL Editor to update your existing database

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Optional: Create an index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
