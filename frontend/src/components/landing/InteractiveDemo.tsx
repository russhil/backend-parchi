'use client';

import { useState, useRef, useCallback } from 'react';
import { useScrollProgress, easeOut, remap } from './ScrollAnimations';

/* ── Fake patient data ── */
const patients = [
    { id: 1, name: 'Anjali Mehta', time: '9:30 AM', age: 45, gender: 'F', reason: 'Follow-up — Chronic Migraine' },
    { id: 2, name: 'Rajesh Kumar', time: '10:00 AM', age: 62, gender: 'M', reason: 'Quarterly Review — T2DM + HTN' },
    { id: 3, name: 'Priya Sharma', time: '10:30 AM', age: 34, gender: 'F', reason: 'New Visit — Fever & Cough' },
];

interface PatientBrief {
    conditions: string[];
    allergies: string[];
    medications: string[];
    vitals: { label: string; value: string; unit: string }[];
    intake: {
        chief_complaint: string;
        onset: string;
        severity: string;
        severityLevel: 'high' | 'moderate' | 'low';
        findings: string[];
        context: string;
    };
    differential: { condition: string; match_pct: number; reasoning: string }[];
    chatSuggestions: string[];
}

const briefs: Record<number, PatientBrief> = {
    1: {
        conditions: ['Chronic Migraine', 'GERD'],
        allergies: ['Aspirin'],
        medications: ['Tab Sumatriptan 50mg SOS', 'Tab Amitriptyline 10mg HS', 'Tab Pantoprazole 40mg OD'],
        vitals: [
            { label: 'Blood Pressure', value: '128/82', unit: 'mmHg' },
            { label: 'Heart Rate', value: '76', unit: 'bpm' },
            { label: 'Temperature', value: '98.4', unit: '°F' },
            { label: 'SpO2', value: '98', unit: '%' },
        ],
        intake: {
            chief_complaint: 'Persistent migraine — worsening frequency',
            onset: '3 months, escalating',
            severity: 'High (8/10)',
            severityLevel: 'high',
            findings: [
                'Frequency increased from 2 to 4-5 episodes/week',
                'Associated photophobia and nausea present',
                'No aura or visual disturbance reported',
                '⚠ Elevated inflammatory markers on last labs',
            ],
            context: 'Patient reports stress at work and disrupted sleep. Previously well-controlled on current regimen. No recent head trauma.',
        },
        differential: [
            { condition: 'Chronic Migraine (Transformed)', match_pct: 82, reasoning: 'Progressive increase in frequency, photophobia, nausea consistent with episodic-to-chronic transformation.' },
            { condition: 'Medication Overuse Headache', match_pct: 61, reasoning: 'Frequent sumatriptan use (>10 days/month) may contribute to rebound pattern.' },
            { condition: 'Secondary Headache — Temporal Arteritis', match_pct: 38, reasoning: 'Elevated ESR/CRP warrants screening, though age is atypical.' },
        ],
        chatSuggestions: ['Review triptan frequency this month', 'Screen for medication overuse headache', 'Check temporal artery tenderness on exam'],
    },
    2: {
        conditions: ['Type 2 Diabetes Mellitus', 'Hypertension', 'Dyslipidemia'],
        allergies: ['Sulfonamides'],
        medications: ['Tab Metformin 1000mg BD', 'Tab Glimepiride 2mg OD', 'Tab Telmisartan 40mg OD', 'Tab Atorvastatin 10mg HS'],
        vitals: [
            { label: 'Blood Pressure', value: '152/94', unit: 'mmHg' },
            { label: 'Heart Rate', value: '84', unit: 'bpm' },
            { label: 'Temperature', value: '98.1', unit: '°F' },
            { label: 'SpO2', value: '97', unit: '%' },
        ],
        intake: {
            chief_complaint: 'Tingling in feet — new onset neuropathy symptoms',
            onset: '2 weeks',
            severity: 'Moderate (6/10)',
            severityLevel: 'moderate',
            findings: [
                'Bilateral tingling and numbness in feet',
                'Home BP readings 150-160/90 consistently',
                '⚠ HbA1c 8.1% — suboptimal glycemic control',
                '⚠ Urine microalbumin elevated (45 mg/L)',
            ],
            context: 'Quarterly review. Patient diet compliance has been poor. No prior neuropathy symptoms. Last eye exam 8 months ago.',
        },
        differential: [
            { condition: 'Diabetic Peripheral Neuropathy', match_pct: 88, reasoning: 'New-onset symmetric distal neuropathy with suboptimal HbA1c strongly suggestive.' },
            { condition: 'B12 Deficiency Neuropathy', match_pct: 45, reasoning: 'Metformin can deplete B12; check serum B12 levels.' },
            { condition: 'Chronic Kidney Disease (Early)', match_pct: 32, reasoning: 'Elevated microalbumin with long-standing diabetes and HTN.' },
        ],
        chatSuggestions: ['Check B12 levels given metformin use', 'Assess need for insulin initiation', 'Order monofilament test for neuropathy grading'],
    },
    3: {
        conditions: [],
        allergies: [],
        medications: ['Tab Paracetamol 650mg SOS (self-medicated)'],
        vitals: [
            { label: 'Blood Pressure', value: '118/76', unit: 'mmHg' },
            { label: 'Heart Rate', value: '92', unit: 'bpm' },
            { label: 'Temperature', value: '100.8', unit: '°F' },
            { label: 'SpO2', value: '97', unit: '%' },
        ],
        intake: {
            chief_complaint: 'Low-grade fever with dry cough — 5 days',
            onset: '5 days',
            severity: 'Mild-Moderate (5/10)',
            severityLevel: 'moderate',
            findings: [
                'Low-grade fever persisting despite paracetamol',
                'Dry cough, non-productive, no hemoptysis',
                'Mild fatigue and body aches',
                'No travel history or known contacts',
            ],
            context: 'First visit. Office worker. No comorbidities. Self-medicated with paracetamol and home rest. No improvement.',
        },
        differential: [
            { condition: 'Viral Upper Respiratory Infection', match_pct: 72, reasoning: 'Classic presentation for self-limiting viral URI. Duration within expected range.' },
            { condition: 'Early COVID-19 / Influenza', match_pct: 58, reasoning: 'Consider rapid antigen test given overlapping symptom profile.' },
            { condition: 'Atypical Pneumonia', match_pct: 29, reasoning: 'Low probability but dry cough > 5 days warrants auscultation.' },
        ],
        chatSuggestions: ['Order rapid antigen test for COVID-19', 'Check for any chest crepitations', 'Advise throat gargle and symptomatic management'],
    },
};

/* ── Helpers ── */
const severityClass = (level: string) => {
    if (level === 'high') return 'demo-severity-high';
    if (level === 'moderate') return 'demo-severity-moderate';
    return 'demo-severity-low';
};

const matchClass = (pct: number) => {
    if (pct >= 70) return 'demo-match-high';
    if (pct >= 50) return 'demo-match-medium';
    return 'demo-match-low';
};

export default function InteractiveDemo() {
    const [activePatient, setActivePatient] = useState<number>(1);
    const frameRef = useRef<HTMLDivElement>(null);
    const { ref: sectionRef, progress } = useScrollProgress();

    // Scroll-driven: demo scales from 0.85 → 1 as it enters viewport
    const demoScale = remap(progress, 0.15, 0.55, 0.85, 1);
    const demoOpacity = easeOut(remap(progress, 0.1, 0.4, 0, 1));
    const demoY = remap(progress, 0.1, 0.5, 40, 0);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const el = frameRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.transform = `rotateY(${x * 4}deg) rotateX(${-y * 3}deg)`;
    }, []);

    const handleMouseLeave = useCallback(() => {
        const el = frameRef.current;
        if (el) el.style.transform = 'rotateY(0) rotateX(0)';
    }, []);

    const brief = briefs[activePatient];
    const patient = patients.find(p => p.id === activePatient)!;

    return (
        <section className="landing-section" id="demo" style={{ paddingTop: '0' }} ref={sectionRef}>
            <div
                className="demo-wrapper"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    opacity: demoOpacity,
                    transform: `translateY(${demoY}px) scale(${demoScale})`,
                    willChange: 'transform, opacity',
                }}
            >
                <div ref={frameRef} className="demo-frame">
                    {/* ── Title bar ── */}
                    <div className="demo-titlebar">
                        <div className="demo-dot demo-dot-red" />
                        <div className="demo-dot demo-dot-yellow" />
                        <div className="demo-dot demo-dot-green" />
                        <span className="demo-titlebar-text">Parchi — Appointment View</span>
                    </div>

                    <div className="demo-body">
                        {/* ══════════ LEFT PANEL — Patient Sidebar ══════════ */}
                        <div className="demo-left-panel">
                            {/* Patient selector */}
                            <div className="demo-patient-selector">
                                {patients.map(p => (
                                    <button
                                        key={p.id}
                                        className={`demo-patient-tab ${activePatient === p.id ? 'active' : ''}`}
                                        onClick={() => setActivePatient(p.id)}
                                    >
                                        <span className="demo-patient-tab-name">{p.name}</span>
                                        <span className="demo-patient-tab-time">{p.time}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Patient header */}
                            <div className="demo-patient-header">
                                <div className="demo-patient-name-big">{patient.name}</div>
                                <div className="demo-patient-meta">{patient.age} Yrs · {patient.gender}</div>
                            </div>

                            {/* Vitals */}
                            <div className="demo-left-section">
                                <div className="demo-left-label">Vitals</div>
                                <div className="demo-vitals-grid">
                                    {brief.vitals.map((v, i) => (
                                        <div key={i} className="demo-vital-card">
                                            <span className="demo-vital-label">{v.label}</span>
                                            <div className="demo-vital-value">
                                                <span>{v.value}</span>
                                                <span className="demo-vital-unit">{v.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Medical History */}
                            <div className="demo-left-section">
                                <div className="demo-left-label">Medical History</div>
                                {brief.conditions.length > 0 && (
                                    <div className="demo-history-group">
                                        <span className="demo-history-sublabel">Chronic Conditions</span>
                                        <div className="demo-tag-row">
                                            {brief.conditions.map(c => (
                                                <span key={c} className="demo-tag demo-tag-condition">{c}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {brief.allergies.length > 0 && (
                                    <div className="demo-history-group">
                                        <span className="demo-history-sublabel">Allergies</span>
                                        <div className="demo-tag-row">
                                            {brief.allergies.map(a => (
                                                <span key={a} className="demo-tag demo-tag-allergy">
                                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>warning</span>
                                                    {a}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {brief.medications.length > 0 && (
                                    <div className="demo-history-group">
                                        <span className="demo-history-sublabel">Current Medications</span>
                                        <div className="demo-med-list">
                                            {brief.medications.map(m => (
                                                <div key={m} className="demo-med-item">{m}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ══════════ RIGHT PANEL — AI Assistant ══════════ */}
                        <div className="demo-right-panel">
                            {/* AI Header */}
                            <div className="demo-ai-header">
                                <div className="demo-ai-header-left">
                                    <div className="demo-ai-icon">
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span>
                                    </div>
                                    <div>
                                        <div className="demo-ai-title">AI Assistant</div>
                                        <div className="demo-ai-subtitle">Analysis based on intake & history</div>
                                    </div>
                                </div>
                                <div className="demo-confidence-badge">
                                    <span className="demo-confidence-label">Confidence</span>
                                    <span className="demo-confidence-value">{brief.differential[0].match_pct}%</span>
                                </div>
                            </div>

                            {/* Status strip */}
                            <div className="demo-status-strip">
                                <span className="demo-status-badge">In Progress</span>
                                <span>{patient.reason}</span>
                            </div>

                            {/* AI 2-column grid */}
                            <div className="demo-ai-grid">
                                {/* ── Left col: AI Intake Summary ── */}
                                <div className="demo-ai-col">
                                    <div className="demo-card">
                                        <div className="demo-card-gradient" />
                                        <div className="demo-card-header">
                                            <span className="material-symbols-outlined demo-card-icon" style={{ color: 'var(--landing-accent)' }}>summarize</span>
                                            <span className="demo-card-title">AI Intake Summary</span>
                                        </div>

                                        {/* Metadata bar */}
                                        <div className="demo-intake-meta">
                                            <div className="demo-intake-meta-item">
                                                <span className="demo-intake-meta-label">Complaint</span>
                                                <span className="demo-intake-meta-value">{brief.intake.chief_complaint}</span>
                                            </div>
                                            <div className="demo-intake-meta-divider" />
                                            <div className="demo-intake-meta-item">
                                                <span className="demo-intake-meta-label">Onset</span>
                                                <span className="demo-intake-meta-value">{brief.intake.onset}</span>
                                            </div>
                                            <div className="demo-intake-meta-divider" />
                                            <div className="demo-intake-meta-item">
                                                <span className="demo-intake-meta-label">Severity</span>
                                                <span className={`demo-severity-badge ${severityClass(brief.intake.severityLevel)}`}>
                                                    {brief.intake.severity}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Findings */}
                                        <ul className="demo-findings-list">
                                            {brief.intake.findings.map((f, i) => (
                                                <li key={i} className="demo-finding-item">
                                                    <span className="material-symbols-outlined" style={{
                                                        fontSize: '14px',
                                                        color: f.includes('⚠') ? 'var(--landing-warning)' : 'var(--landing-accent)',
                                                    }}>
                                                        {f.includes('⚠') ? 'warning' : 'check_circle'}
                                                    </span>
                                                    <span>{f.replace('⚠ ', '')}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Context */}
                                        <div className="demo-context-box">
                                            <div className="demo-context-label">Context</div>
                                            <p className="demo-context-text">{brief.intake.context}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Right col: Differential + AI Chat ── */}
                                <div className="demo-ai-col">
                                    {/* Differential Diagnosis */}
                                    <div className="demo-card">
                                        <div className="demo-card-gradient" style={{ background: 'linear-gradient(225deg, rgba(168,85,247,0.04) 0%, transparent 60%)' }} />
                                        <div className="demo-card-header">
                                            <span className="material-symbols-outlined demo-card-icon" style={{ color: '#a855f7' }}>lightbulb</span>
                                            <span className="demo-card-title">Differential Diagnosis</span>
                                        </div>
                                        <div className="demo-diff-list">
                                            {brief.differential.map((d, i) => (
                                                <div key={i} className={`demo-diff-item ${i === 0 ? 'demo-diff-top' : ''}`}>
                                                    <div className="demo-diff-item-header">
                                                        <span className="demo-diff-condition">{d.condition}</span>
                                                        <span className={`demo-diff-badge ${matchClass(d.match_pct)}`}>
                                                            {d.match_pct}%
                                                        </span>
                                                    </div>
                                                    <p className="demo-diff-reasoning">{d.reasoning}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Ask AI Chat */}
                                    <div className="demo-card demo-chat-card">
                                        <div className="demo-chat-suggestions">
                                            {brief.chatSuggestions.map((s, i) => (
                                                <span key={i} className="demo-chat-chip">{s}</span>
                                            ))}
                                        </div>
                                        <div className="demo-chat-input">
                                            <div className="demo-chat-bot-icon">
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>smart_toy</span>
                                            </div>
                                            <span className="demo-chat-placeholder">Ask AI about this patient...</span>
                                            <div className="demo-chat-send">
                                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
