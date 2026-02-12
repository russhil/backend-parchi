-- Enable UUID extension if needed (though app generates string IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Patients
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY DEFAULT 'p-' || substr(md5(random()::text), 1, 8),
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

-- 2. Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY DEFAULT 'a-' || substr(md5(random()::text), 1, 8),
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'scheduled',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Visits (Past visits/history)
CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY DEFAULT 'v-' || substr(md5(random()::text), 1, 8),
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    visit_time TIMESTAMPTZ NOT NULL,
    summary_ai TEXT,
    doctor_notes_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Documents
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY DEFAULT 'd-' || substr(md5(random()::text), 1, 8),
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    doc_type TEXT DEFAULT 'general',
    extracted_text TEXT,
    file_url TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Consult Sessions (Live transcriptions)
CREATE TABLE IF NOT EXISTS consult_sessions (
    id TEXT PRIMARY KEY DEFAULT 'cs-' || substr(md5(random()::text), 1, 8),
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    transcript_text TEXT,
    soap_note JSONB,
    insights_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI Intake Summaries
CREATE TABLE IF NOT EXISTS ai_intake_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    summary_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Differential Diagnoses
CREATE TABLE IF NOT EXISTS differential_diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    condition_name TEXT,
    match_pct INTEGER,
    rationale TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Report Insights
CREATE TABLE IF NOT EXISTS report_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    insight_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    medications JSONB DEFAULT '[]'::jsonb,
    diagnosis TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Notes
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
    content TEXT,
    note_type TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
