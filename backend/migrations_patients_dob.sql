-- Add DOB to patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS dob DATE;

-- Create index for search optimization if needed
CREATE INDEX IF NOT EXISTS idx_patients_dob ON patients(dob);
