"use client";

import type { Patient, Vitals } from "@/types";

interface PatientProfileProps {
  patient: Patient;
}

export default function PatientProfile({ patient }: PatientProfileProps) {
  const vitals = patient.vitals || {} as Vitals;
  const hasHeight = patient.height_cm != null && patient.height_cm > 0;
  const hasWeight = patient.weight_kg != null && patient.weight_kg > 0;
  const hasBody = hasHeight || hasWeight;
  const bmi = hasHeight && hasWeight
    ? (patient.weight_kg / ((patient.height_cm / 100) ** 2)).toFixed(1)
    : null;

  const hasVitals = vitals.bp_systolic || vitals.spo2 || vitals.heart_rate || vitals.temperature_f;
  const hasConditions = Array.isArray(patient.conditions) && patient.conditions.filter(Boolean).length > 0;
  const hasMedications = Array.isArray(patient.medications) && patient.medications.filter(Boolean).length > 0;
  const hasAllergies = Array.isArray(patient.allergies) && patient.allergies.filter(Boolean).length > 0;

  return (
    <div className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden">
      {/* Patient Header */}
      <div className="px-5 py-5 border-b border-border-light">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-lg">
            {patient.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">{patient.name}</h2>
            <p className="text-xs text-text-secondary">
              {patient.age ? `${patient.age}y` : "Age N/A"} • {patient.gender || "N/A"} • ID: {patient.id.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {patient.phone ? (
            <span className="flex items-center gap-1 text-text-secondary">
              <span className="material-symbols-outlined text-[14px]">phone</span>
              {patient.phone}
            </span>
          ) : null}
          {patient.email ? (
            <span className="flex items-center gap-1 text-text-secondary">
              <span className="material-symbols-outlined text-[14px]">mail</span>
              {patient.email}
            </span>
          ) : null}
        </div>
      </div>

      {/* Body Measurements — hidden if no data */}
      {hasBody && (
        <div className="px-5 py-4 border-b border-border-light">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3">Body</h3>
          <div className="grid grid-cols-3 gap-3">
            {hasHeight && (
              <div className="text-center">
                <p className="text-lg font-bold text-text-primary">{patient.height_cm}</p>
                <p className="text-[10px] text-text-secondary">Height (cm)</p>
              </div>
            )}
            {hasWeight && (
              <div className="text-center">
                <p className="text-lg font-bold text-text-primary">{patient.weight_kg}</p>
                <p className="text-[10px] text-text-secondary">Weight (kg)</p>
              </div>
            )}
            {bmi && (
              <div className="text-center">
                <p className="text-lg font-bold text-text-primary">{bmi}</p>
                <p className="text-[10px] text-text-secondary">BMI</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vitals — hidden if no data */}
      {hasVitals && (
        <div className="px-5 py-4 border-b border-border-light">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3">Vitals</h3>
          <div className="grid grid-cols-2 gap-3">
            {vitals.bp_systolic && vitals.bp_diastolic && (
              <VitalCard icon="bloodtype" label="Blood Pressure" value={`${vitals.bp_systolic}/${vitals.bp_diastolic}`} unit="mmHg" />
            )}
            {vitals.spo2 && (
              <VitalCard icon="spo2" label="SpO2" value={`${vitals.spo2}`} unit="%" />
            )}
            {vitals.heart_rate && (
              <VitalCard icon="heart_check" label="Heart Rate" value={`${vitals.heart_rate}`} unit="bpm" />
            )}
            {vitals.temperature_f && (
              <VitalCard icon="thermostat" label="Temperature" value={`${vitals.temperature_f}`} unit="°F" />
            )}
          </div>
        </div>
      )}

      {/* Known Conditions — hidden if empty */}
      {hasConditions && (
        <div className="px-5 py-4 border-b border-border-light">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3">Conditions</h3>
          <div className="flex flex-wrap gap-2">
            {patient.conditions.filter(Boolean).map((cond) => (
              <span key={cond} className="px-2.5 py-1 bg-primary-light text-primary text-xs font-medium rounded-lg">
                {cond}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Medications — hidden if empty */}
      {hasMedications && (
        <div className="px-5 py-4 border-b border-border-light">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3">Medications</h3>
          <ul className="space-y-1.5">
            {patient.medications.filter(Boolean).map((med) => (
              <li key={med} className="flex items-start gap-2 text-xs text-text-primary">
                <span className="material-symbols-outlined text-primary text-[14px] mt-0.5">medication</span>
                {med}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Allergies — hidden if empty */}
      {hasAllergies && (
        <div className="px-5 py-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3">Allergies</h3>
          <div className="flex flex-wrap gap-2">
            {patient.allergies.filter(Boolean).map((allergy) => (
              <span key={allergy} className="px-2.5 py-1 bg-red-50 text-danger text-xs font-medium rounded-lg">
                ⚠ {allergy}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VitalCard({ icon, label, value, unit }: { icon: string; label: string; value: string; unit: string }) {
  return (
    <div className="bg-bg rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="material-symbols-outlined text-primary text-[16px]">{icon}</span>
        <span className="text-[10px] text-text-secondary font-medium">{label}</span>
      </div>
      <p className="text-base font-bold text-text-primary">
        {value} <span className="text-xs font-normal text-text-secondary">{unit}</span>
      </p>
    </div>
  );
}
