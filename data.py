"""
In-memory seed data for Parchi.ai demo.
All data stored as Python dicts — no external DB needed.
"""

from datetime import datetime, timedelta

today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

patients = {
    "p1": {
        "id": "p1",
        "name": "Sarah Jenkins",
        "age": 34,
        "gender": "Female",
        "phone": "+91 98765 43210",
        "email": "sarah.jenkins@email.com",
        "address": "42 MG Road, Bengaluru, Karnataka",
        "height_cm": 165,
        "weight_kg": 62,
        "allergies": ["Penicillin", "Dust mites"],
        "medications": ["Levothyroxine 50mcg daily", "Salbutamol inhaler PRN"],
        "conditions": ["Mild Asthma", "Hypothyroidism"],
        "vitals": {
            "bp_systolic": 120,
            "bp_diastolic": 80,
            "spo2": 98,
            "heart_rate": 72,
            "temperature_f": 98.6,
            "recorded_at": (today - timedelta(hours=1)).isoformat(),
        },
    }
}

appointments = {
    "a1": {
        "id": "a1",
        "patient_id": "p1",
        "start_time": today.replace(hour=9, minute=30).isoformat(),
        "status": "scheduled",
        "reason": "Follow-up: Migraine",
    },
    "a2": {
        "id": "a2",
        "patient_id": "p1",
        "start_time": (today + timedelta(days=1)).replace(hour=11, minute=0).isoformat(),
        "status": "scheduled",
        "reason": "Routine check",
    },
}

visits = {
    "v1": {
        "id": "v1",
        "patient_id": "p1",
        "visit_time": (today - timedelta(days=14)).isoformat(),
        "doctor_notes_text": "Patient reports recurring migraines over the past 3 weeks. Onset typically in the afternoon, 6/10 severity, throbbing quality, right-sided. Associated with nausea but no visual aura. No recent head trauma. Sleep pattern disrupted — averaging 5 hours/night due to work stress. Advised to maintain headache diary, improve sleep hygiene. Prescribed Sumatriptan 50mg PRN.",
        "summary_ai": "Recurring migraines (3 weeks), right-sided, throbbing, 6/10 severity. Associated nausea, no aura. Likely tension-type/migraine overlap exacerbated by poor sleep and work stress. Started Sumatriptan PRN.",
        "soap_ai": {
            "subjective": "Patient reports recurring headaches over 3 weeks, right-sided, throbbing, 6/10 severity. Associated nausea, no aura. Poor sleep (~5hrs/night). Work stress increased.",
            "objective": "BP 118/76, HR 70, alert and oriented. No papilledema. Cranial nerves intact. Neck supple, no meningeal signs.",
            "assessment": "Migraine without aura, likely exacerbated by sleep deprivation and stress. Differential includes tension-type headache.",
            "plan": "1. Sumatriptan 50mg PRN for acute episodes\n2. Sleep hygiene counseling\n3. Headache diary for 2 weeks\n4. Follow-up in 2 weeks\n5. Consider prophylaxis if frequency >4/month",
        },
    },
    "v2": {
        "id": "v2",
        "patient_id": "p1",
        "visit_time": (today - timedelta(days=60)).isoformat(),
        "doctor_notes_text": "Routine thyroid follow-up. Patient compliant with Levothyroxine 50mcg. No symptoms of hypo/hyperthyroidism. Energy levels stable. Weight stable at 62kg. TSH levels reviewed — within normal range.",
        "summary_ai": "Routine thyroid follow-up. Levothyroxine 50mcg continued. TSH within normal limits. No symptoms. Stable.",
        "soap_ai": {
            "subjective": "No complaints. Energy levels good. Compliant with medication.",
            "objective": "Weight 62kg (stable). Thyroid non-tender, no nodules palpable. TSH 2.4 mIU/L (normal).",
            "assessment": "Hypothyroidism — well-controlled on current dose.",
            "plan": "1. Continue Levothyroxine 50mcg daily\n2. Repeat TSH in 6 months\n3. Routine follow-up",
        },
    },
}

documents = {
    "d1": {
        "id": "d1",
        "patient_id": "p1",
        "title": "Complete Blood Count (CBC)",
        "doc_type": "lab_report",
        "uploaded_at": (today - timedelta(days=10)).isoformat(),
        "extracted_text": "CBC Report — Sarah Jenkins, 34F\nDate: {date}\n\nWBC: 7.2 x10³/µL (Normal: 4.5-11.0)\nRBC: 4.5 x10⁶/µL (Normal: 4.0-5.5)\nHemoglobin: 13.1 g/dL (Normal: 12.0-16.0)\nHematocrit: 39.2% (Normal: 36-46%)\nPlatelets: 245 x10³/µL (Normal: 150-400)\nESR: 12 mm/hr (Normal: 0-20)\n\n⚠ CRP: 8.2 mg/L (Normal: <3.0) — ELEVATED\n\nImpression: Mildly elevated CRP suggesting low-grade inflammation. All other parameters within normal limits.".format(
            date=(today - timedelta(days=10)).strftime("%d %b %Y")
        ),
    },
    "d2": {
        "id": "d2",
        "patient_id": "p1",
        "title": "Thyroid Panel",
        "doc_type": "lab_report",
        "uploaded_at": (today - timedelta(days=60)).isoformat(),
        "extracted_text": "Thyroid Function Test — Sarah Jenkins, 34F\nDate: {date}\n\nTSH: 2.4 mIU/L (Normal: 0.4-4.0)\nFree T4: 1.1 ng/dL (Normal: 0.8-1.8)\nFree T3: 3.2 pg/mL (Normal: 2.3-4.2)\n\nImpression: Thyroid function within normal limits on Levothyroxine 50mcg. No dose adjustment needed.".format(
            date=(today - timedelta(days=60)).strftime("%d %b %Y")
        ),
    },
    "d3": {
        "id": "d3",
        "patient_id": "p1",
        "title": "MRI Brain — Referral Letter",
        "doc_type": "referral",
        "uploaded_at": (today - timedelta(days=7)).isoformat(),
        "extracted_text": "Referral for MRI Brain — Sarah Jenkins, 34F\n\nReferring Physician: YC\nIndication: Recurring migraines (3+ weeks), right-sided, to rule out structural pathology.\nClinical Notes: No focal neurological deficits. No papilledema. Migraines not responding fully to Sumatriptan.\n\nPlease schedule MRI Brain with contrast at earliest convenience.",
    },
}

# Pre-seeded AI intake summary for the patient page
ai_intake_summary = {
    "p1": {
        "chief_complaint": "Recurring migraines — follow-up visit",
        "onset": "3 weeks ago, worsening over past week",
        "severity": "6/10, occasionally reaching 8/10",
        "findings": [
            "Right-sided throbbing headache, primarily afternoon onset",
            "Associated nausea, no visual aura or photophobia",
            "Poor sleep pattern (~5 hrs/night) linked to work stress",
            "Sumatriptan 50mg provides partial relief (onset 45 min)",
            "No recent head trauma or neurological deficits",
            "⚠ CRP elevated at 8.2 mg/L — may indicate underlying inflammation",
        ],
        "context": "Patient has known history of mild asthma and hypothyroidism (well-controlled). Currently on Levothyroxine 50mcg and Salbutamol PRN. MRI Brain referral pending.",
    }
}

# Pre-seeded differential diagnosis
differential_diagnosis = {
    "p1": [
        {"condition": "Migraine without Aura", "match_pct": 82, "reasoning": "Throbbing, unilateral, with nausea. Classic pattern."},
        {"condition": "Tension-type Headache", "match_pct": 65, "reasoning": "Stress and sleep deprivation are major triggers."},
        {"condition": "Medication Overuse Headache", "match_pct": 30, "reasoning": "Monitor Sumatriptan frequency — risk if >10 days/month."},
        {"condition": "Secondary Headache", "match_pct": 15, "reasoning": "Low probability. No red flags. MRI pending to rule out."},
    ]
}

# Pre-seeded report insights
report_insights = {
    "p1": {
        "summary": "3 documents on file. Key finding: elevated CRP (8.2 mg/L) in recent CBC may correlate with migraine inflammation pathway. Thyroid panel normal — no dose adjustment needed. MRI referral submitted, pending scheduling.",
        "flags": [
            {"type": "warning", "text": "CRP 8.2 mg/L (elevated) — consider inflammatory workup if migraines persist"},
            {"type": "info", "text": "TSH 2.4 mIU/L — well-controlled, next check in 6 months"},
            {"type": "info", "text": "MRI Brain referral pending — follow up on scheduling"},
        ],
    }
}

# Mutable list for consult sessions created at runtime
consult_sessions: list[dict] = []
