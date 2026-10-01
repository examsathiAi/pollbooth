"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Sparkles, X } from "lucide-react";

interface ProgressiveGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
}

type FieldConfig = {
  key: string;
  question: string;
  options?: { label: string; value: string }[];
  allowTyping?: boolean;
};

const FIELD_CONFIGS: FieldConfig[] = [
  {
    key: "age_bracket",
    question: "Which generation speaks for you?",
    options: [
      { label: "Gen Alpha", value: "GEN_ALPHA" },
      { label: "Gen Z (Born 1997 - 2012)", value: "GEN_Z" },
      { label: "Millennial (Born 1981 - 1996)", value: "MILLENNIAL" },
      { label: "Gen X (Born 1965 - 1980)", value: "GEN_X" },
      { label: "Boomer (Born 1946 - 1964)", value: "BOOMER" },
      { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" }
    ]
  },
  {
    key: "gender",
    question: "How do you identify?",
    options: [
      { label: "Male", value: "MALE" },
      { label: "Female", value: "FEMALE" },
      { label: "Non-binary", value: "NON_BINARY" },
      { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" }
    ]
  },
  {
    key: "city",
    question: "Which city are you voting from?",
    allowTyping: true,
    options: [
      { label: "Delhi", value: "Delhi" },
      { label: "Mumbai", value: "Mumbai" },
      { label: "Bengaluru", value: "Bengaluru" }
    ]
  },
  {
    key: "employment",
    question: "What is your current employment status?",
    allowTyping: true,
    options: [
      { label: "Student", value: "Student" },
      { label: "Employed", value: "Employed" },
      { label: "Self-employed", value: "Self-employed" }
    ]
  }
];

export function ProgressiveGateModal({ isOpen, onClose, onSelect }: ProgressiveGateModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [currentField, setCurrentField] = useState<FieldConfig | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [customInput, setCustomInput] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setMessage("");
      setCustomInput("");
      return;
    }

    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const res = await api.get("/api/v1/users/profile");
        const user = res.data;
        const profile = user.profile || {};
        
        let missingField = null;
        for (const config of FIELD_CONFIGS) {
           const val = user[config.key] || profile[config.key];
           if (!val) {
             missingField = config;
             break;
           }
        }

        if (missingField) {
          setCurrentField(missingField);
        } else {
          onClose(); // Auto-close if profile is fully complete
        }
      } catch (err) {
        setCurrentField(FIELD_CONFIGS[0]); // Fallback safely
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [isOpen, onClose]);

  const handleSave = async (value: string) => {
    if (!value.trim() || !currentField) return;
    setIsSaving(true);
    setMessage("");
    try {
      await api.patch("/api/v1/users/profile", { [currentField.key]: value });
      onSelect(value);
      setMessage("Saved. Your profile is now more complete.");
      setTimeout(() => onClose(), 700);
    } catch {
      setMessage("We could not save this right now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1f1b18]/40 px-3 py-4 md:items-center">
      <div className="w-full max-w-md rounded-[28px] border border-[#d8ceb8] bg-[#fffdf9] p-5 text-[#1f1b18] shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-maroon">
              <Sparkles className="h-4 w-4" />
              Quick Check
            </div>
            <h3 className="mt-2 text-lg font-semibold text-[#1f1b18]">
              {loadingProfile ? "Loading..." : currentField?.question}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#625a50]">This helps PollBooth surface more relevant local voices without blocking your vote.</p>
          </div>
          <button onClick={onClose} disabled={isSaving} className="rounded-full border border-[#d8ceb8] p-2 text-[#625a50] transition hover:border-maroon hover:text-maroon">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!loadingProfile && currentField && (
          <div className="mt-4 grid gap-2">
            {currentField.options?.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSave(option.value)}
                disabled={isSaving}
                className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] px-3 py-3 text-left text-sm font-medium text-[#1f1b18] transition hover:border-maroon hover:text-maroon disabled:opacity-60"
              >
                {option.label}
              </button>
            ))}
            
            {currentField.allowTyping && (
              <div className="mt-2 flex gap-2">
                <input 
                  type="text" 
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Type your own..." 
                  className="flex-1 rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] focus:border-maroon focus:outline-none"
                />
                <button 
                  onClick={() => handleSave(customInput)}
                  disabled={isSaving || !customInput.trim()}
                  className="rounded-xl bg-maroon px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        )}
        
        {message && <p className="mt-3 text-sm text-maroon">{message}</p>}
      </div>
    </div>
  );
}
