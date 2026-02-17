-- Clinical Dumps table for storing raw consultation transcripts and manual notes
-- Run this on Supabase SQL Editor

CREATE TABLE IF NOT EXISTS clinical_dumps (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
    consult_session_id TEXT REFERENCES consult_sessions(id) ON DELETE SET NULL,
    transcript_text TEXT,
    manual_notes TEXT,
    combined_dump TEXT,
    dump_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_dumps_patient ON clinical_dumps(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_dumps_appointment ON clinical_dumps(appointment_id);
