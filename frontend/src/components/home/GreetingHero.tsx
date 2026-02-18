"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues with audio APIs
const GeminiLiveChat = dynamic(() => import("./GeminiLiveChat"), { ssr: false });

export default function GreetingHero() {
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [doctorName, setDoctorName] = useState("Doctor");

  useEffect(() => {
    const stored = localStorage.getItem("user_info");
    if (stored) {
      try {
        const userInfo = JSON.parse(stored);
        if (userInfo.doctor_name) {
          setDoctorName(userInfo.doctor_name);
        }
      } catch (e) {
        console.error("Failed to parse user info", e);
      }
    }
  }, []);

  return (
    <div className="text-center mb-6 md:mb-8 w-full max-w-2xl">
      <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
        Hi {doctorName}, how can I help you today?
      </h2>
      <p className="text-text-secondary text-sm md:text-base px-4">
        Your AI assistant is ready to help with patient records, diagnoses, and documentation.
      </p>

      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={() => setShowVoiceChat(true)}
          className="flex items-center gap-3 px-6 py-3.5 bg-primary text-white rounded-2xl font-semibold text-sm hover:bg-primary-dark transition shadow-md w-full sm:w-auto max-w-xs"
        >
          <span className="material-symbols-outlined text-[22px]">mic</span>
          Talk to Me
        </button>
      </div>

      {showVoiceChat && (
        <GeminiLiveChat onClose={() => setShowVoiceChat(false)} />
      )}
    </div>
  );
}
