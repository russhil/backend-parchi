# Parchi.ai - AI Medical Records System

> A doctor-facing AI medical record system for Indian clinics. Everything the doctor needs at a glance before the patient enters, and everything documented automatically after the consult.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│   Next.js 16 + TypeScript + Tailwind CSS                    │
│   Pages: Home, Patients, Appointments, Patient View, Consult│
└────────────────────────────┬────────────────────────────────┘
                             │ REST API
┌────────────────────────────▼────────────────────────────────┐
│                         Backend                             │
│   FastAPI + Python 3.11                                     │
│   Endpoints: /patients, /search, /chat, /consult, etc.      │
└────────────────────────────┬────────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
┌─────────────────────┐               ┌─────────────────────┐
│     Supabase        │               │   Google AI Studio  │
│   PostgreSQL DB     │               │   Gemma-3-27b-it    │
│   Patient records   │               │   Chat & Analysis   │
└─────────────────────┘               └─────────────────────┘
```

## Quick Start

### 1. Database Setup

Run the seed SQL in your Supabase dashboard:
```sql
-- Go to Supabase SQL Editor and run:
-- /supabase/seed.sql
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Edit .env with your Google AI API key
# GOOGLE_API_KEY=your-key-here

uvicorn main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon key |
| `GOOGLE_API_KEY` | Google AI Studio API key |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients` | List all patients |
| GET | `/patient/{id}` | Get patient with all related data |
| POST | `/search` | Search patients by query |
| POST | `/chat` | AI chat about patient |
| POST | `/consult/start` | Start voice consult session |
| POST | `/consult/{id}/stop` | Stop consult, generate SOAP note |
| GET | `/appointments` | List all appointments |
| POST | `/appointments/mark-seen` | Mark patient as seen |
| POST | `/prescriptions` | Create prescription |
| POST | `/notes` | Create manual note |
| POST | `/documents/upload` | Upload document |

## Pages

- **`/`** - Home with greeting, search, and today's appointments
- **`/patients`** - Patient list with search/filter
- **`/appointments`** - Appointment schedule management
- **`/patient/{id}`** - Patient overview with AI insights
- **`/consult/{id}`** - Voice consult with SOAP generation
- **`/settings`** - Configuration and profile

## Key Features

1. **Smart Search** - Search across patient names, conditions, medications, documents
2. **AI Chat** - Ask questions about patient records using Gemma AI
3. **Voice Consult** - Record/transcribe consults, auto-generate SOAP notes
4. **Differential Diagnosis** - AI-suggested diagnoses with confidence scores
5. **Report Insights** - Automatic flagging of abnormal lab values
6. **Prescriptions** - Create and save medication prescriptions
7. **Document Upload** - Attach lab reports, imaging, referrals

## Database Schema

- `patients` - Core patient demographics and medical profile
- `appointments` - Scheduled and completed visits
- `visits` - Past visit records with SOAP notes
- `documents` - Uploaded medical documents
- `consult_sessions` - Voice consults with transcripts
- `prescriptions` - Medication prescriptions
- `notes` - Manual clinical notes
- `ai_intake_summaries` - Pre-consult AI summaries
- `differential_diagnoses` - AI diagnostic suggestions
- `report_insights` - Document analysis and flags

## Seed Data

10 patients pre-loaded with diverse conditions:
- Sarah Jenkins (Migraine, Asthma, Hypothyroidism)
- Rajesh Kumar (Type 2 DM, Hypertension)
- Priya Sharma (Post-PTCA, CAD)
- Amit Patel (Back Pain, GERD)
- Lakshmi Venkatesh (MCI, Diabetes, Osteoporosis)
- Mohammed Farooq (COPD)
- Anita Reddy (PCOS, Hypothyroidism)
- Venkat Rao (Post TKR, AF)
- Deepa Menon (GAD, Insomnia)
- Suresh Iyer (CKD Stage 3b)
