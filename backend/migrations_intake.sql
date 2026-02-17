-- Intake Tokens for Receptionist Setup
CREATE TABLE IF NOT EXISTS intake_tokens (
    token UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id TEXT REFERENCES appointments(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    dob DATE,
    is_new_patient BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending', -- pending, completed, expired
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_intake_tokens_token ON intake_tokens(token);
CREATE INDEX IF NOT EXISTS idx_intake_tokens_appointment_id ON intake_tokens(appointment_id);
