# Parchi.ai — AI Medical Records Demo

A doctor-facing AI medical record system for clinincs. Everything the doctor needs at a glance before the patient enters, and everything documented automatically after the consult.

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL + Auth)
- **AI**: Google AI Studio (Gemma 3) and Vertex AI (Gemini Live)

## Quick Start

### 1. Database Setup
1. Create a [Supabase](https://supabase.com/) project.
2. Run the SQL in `supabase/seed.sql` in your Supabase SQL Editor to set up the schema and sample data.

### 2. Backend Setup (Python)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase and Google/Vertex API keys
uvicorn main:app --reload
```
Backend runs at `http://localhost:8000`.

### 3. Frontend Setup (Next.js)
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
Frontend runs at `http://localhost:3000`.

## Environment Variables

### Backend (`backend/.env`)
- `SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_KEY`: Your Supabase Anon/Public Key.
- `GOOGLE_API_KEY`: Google AI Studio API Key (for Gemma).
- `GEMINI_API_KEY`: API Key for Gemini Live (optional if using GCP auth).
- `GCP_PROJECT_ID`: Google Cloud Project ID.
- `GCP_LOCATION`: Vertex AI location (e.g., `us-central1`).

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_API_URL`: URL of the FastAPI backend (default: `http://localhost:8000`).

## Development

The app uses `supabase/seed.sql` for the initial database structure. If you make schema changes, update the seed file accordingly.
