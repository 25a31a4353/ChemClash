"use client";

/**
 * ChemClash — Snap-to-Solve
 *
 * Student uploads an image of a chemistry question/notebook.
 * Backend analyses it via OpenAI vision (if configured) and returns
 * a Socratic response — no final answer revealed.
 *
 * If the backend reports vision is not supported, a clear configuration
 * state is shown rather than pretending analysis works.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import {
  snapAnalyze,
  type SnapResponse,
  type SnapPersona,
  type SnapLanguage,
} from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

type UIState =
  | "idle"        // waiting for image upload
  | "preview"     // image chosen, ready to analyse
  | "loading"     // request in flight
  | "result"      // response received
  | "error";      // network/API error

// ── Persona + Language config ──────────────────────────────────────────────

interface PersonaDef {
  id: SnapPersona;
  label: string;
  icon: string;
  description: string;
}

const PERSONAS: PersonaDef[] = [
  { id: "socratic",       label: "Socratic",       icon: "🤔", description: "Guides with questions only" },
  { id: "concept_coach",  label: "Concept Coach",  icon: "📖", description: "Explains the underlying principle" },
  { id: "exam_coach",     label: "Exam Coach",     icon: "🎯", description: "JEE traps & exam shortcuts" },
  { id: "quick_revision", label: "Quick Revision", icon: "⚡", description: "Concise key takeaway" },
];

interface LangDef {
  id: SnapLanguage;
  label: string;
  native: string;
}

const LANGUAGES: LangDef[] = [
  { id: "english", label: "English",  native: "English" },
  { id: "telugu",  label: "Telugu",   native: "తెలుగు"   },
  { id: "hindi",   label: "Hindi",    native: "हिन्दी"     },
];

// ── Helper: read file → base64 ─────────────────────────────────────────────

function fileToBase64(file: File): Promise<{ b64: string; mediaType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // dataUrl = "data:image/jpeg;base64,/9j/4AAQ..."
      const [prefix, b64] = dataUrl.split(",");
      const mediaType = prefix.split(":")[1].split(";")[0];
      resolve({ b64, mediaType, dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Preferences selector ───────────────────────────────────────────────────

interface PrefsProps {
  persona: SnapPersona;
  language: SnapLanguage;
  onPersona: (p: SnapPersona) => void;
  onLanguage: (l: SnapLanguage) => void;
  disabled: boolean;
}

function PrefsSelector({ persona, language, onPersona, onLanguage, disabled }: PrefsProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      {/* Persona */}
      <div>
        <p className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-2">
          Mentor Persona
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              disabled={disabled}
              onClick={() => onPersona(p.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all text-xs font-semibold ${
                persona === p.id
                  ? "border-violet-400 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className="text-base leading-none">{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[0.6rem] text-slate-400 mt-1 leading-relaxed">
          {PERSONAS.find((p) => p.id === persona)?.description}
        </p>
      </div>

      {/* Language */}
      <div>
        <p className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-2">
          Response Language
        </p>
        <div className="flex gap-2 flex-wrap">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              disabled={disabled}
              onClick={() => onLanguage(l.id)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                language === l.id
                  ? "border-violet-400 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-violet-200"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {l.native}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mentor panel ───────────────────────────────────────────────────────────

interface MentorPanelProps {
  response: SnapResponse;
  persona: SnapPersona;
  language: SnapLanguage;
}

function MentorPanel({ response, persona, language }: MentorPanelProps) {
  const personaDef = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];
  const langDef    = LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[0];

  if (!response.supported) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⚙️</span>
          <span className="text-xs font-bold tracking-widest text-amber-700 uppercase">
            Vision Model Not Configured
          </span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">{response.reason}</p>
        <div className="bg-white border border-amber-100 rounded-xl px-4 py-3 text-xs text-slate-500 leading-relaxed font-mono">
          <p className="font-bold text-slate-700 mb-1">To enable Snap-to-Solve:</p>
          <p>1. Set <code className="text-amber-700">LLM_PROVIDER=openai</code> in your <code>.env</code></p>
          <p>2. Set <code className="text-amber-700">OPENAI_API_KEY=sk-…</code></p>
          <p>3. Set <code className="text-amber-700">OPENAI_MODEL=gpt-4o-mini</code> (or gpt-4o)</p>
        </div>
      </div>
    );
  }

  const rows: { label: string; value: string; accent: string }[] = [
    { label: "What I see",        value: response.identified,       accent: "text-slate-700" },
    { label: "First concern",     value: response.first_issue,      accent: "text-red-700" },
    { label: "Key principle",     value: response.principle,        accent: "text-violet-700" },
  ];

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-4">
      {/* Header — shows active persona + language */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{personaDef.icon}</span>
          <span className="text-xs font-bold tracking-widest text-emerald-700 uppercase">
            {personaDef.label} Mentor
          </span>
        </div>
        <span className="text-[0.65rem] font-semibold text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
          {langDef.native}
        </span>
      </div>

      {/* Diagnosis rows */}
      {rows.map(({ label, value, accent }) => (
        <div key={label}>
          <p className="text-[0.65rem] font-semibold tracking-widest text-slate-400 uppercase mb-0.5">
            {label}
          </p>
          <p className={`text-sm font-medium leading-relaxed ${accent}`}>{value}</p>
        </div>
      ))}

      {/* Guiding question — visually prominent */}
      <div className="rounded-xl border border-emerald-300 bg-white px-4 py-4">
        <p className="text-[0.65rem] font-semibold tracking-widest text-emerald-600 uppercase mb-1">
          {persona === "quick_revision" ? "Key Takeaway →" : "Think about this →"}
        </p>
        <p className="text-sm font-bold text-slate-800 leading-relaxed italic">
          "{response.socratic_question}"
        </p>
      </div>

      <p className="text-[0.65rem] text-slate-400 leading-relaxed">
        {persona === "quick_revision"
          ? "Use the takeaway above to revise this concept quickly."
          : "Work through the guiding question above before checking any answer key."}
      </p>
    </div>
  );
}

// ── Upload zone ────────────────────────────────────────────────────────────

interface UploadZoneProps {
  onFile: (file: File) => void;
}

function UploadZone({ onFile }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;
    onFile(file);
  }

  return (
    <div
      className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 py-16 px-6 cursor-pointer transition-all ${
        dragging
          ? "border-violet-400 bg-violet-50"
          : "border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
    >
      <span className="text-4xl">📸</span>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-700 mb-1">Drop or click to upload</p>
        <p className="text-xs text-slate-400">
          Photo of a chemistry question, reaction, or notebook page
        </p>
        <p className="text-xs text-slate-400">JPEG · PNG · WEBP · up to 5 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SnapToSolvePage() {
  const [uiState, setUiState]     = useState<UIState>("idle");
  const [dataUrl, setDataUrl]     = useState<string | null>(null);
  const [b64, setB64]             = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>("image/jpeg");
  const [response, setResponse]   = useState<SnapResponse | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  // Preferences — persist for the session
  const [persona, setPersona]   = useState<SnapPersona>("socratic");
  const [language, setLanguage] = useState<SnapLanguage>("english");

  function handleFile(file: File) {
    fileToBase64(file).then(({ b64: encoded, mediaType: mt, dataUrl: du }) => {
      setB64(encoded);
      setMediaType(mt);
      setDataUrl(du);
      setUiState("preview");
      setResponse(null);
      setErrorMsg(null);
    });
  }

  async function handleAnalyse() {
    if (!b64) return;
    setUiState("loading");
    try {
      const result = await snapAnalyze(b64, mediaType, persona, language);
      setResponse(result);
      setUiState("result");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Unexpected error");
      setUiState("error");
    }
  }

  function handleReset() {
    setUiState("idle");
    setDataUrl(null);
    setB64(null);
    setResponse(null);
    setErrorMsg(null);
    // Persona + language are intentionally preserved across uploads
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-500 text-sm font-medium no-underline hover:text-slate-700 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-violet-600 text-xs font-semibold tracking-wide uppercase">
            Snap-to-Solve
          </span>
        </div>
        {(uiState !== "idle") && (
          <button
            onClick={handleReset}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 bg-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Reset ↺
          </button>
        )}
      </div>

      <main className="max-w-xl mx-auto px-4 py-10 pb-24">

        {/* Header */}
        <div className="mb-7">
          <p className="text-xs font-semibold tracking-widest text-violet-600 uppercase mb-2">AI Doubt Solver</p>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            📸 Snap-to-<span className="text-violet-600">Solve</span>
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Upload a photo of a chemistry question or notebook reaction. The AI mentor
            will identify your first questionable step and ask a guiding question —
            without giving away the answer.
          </p>
        </div>

        {/* Persona + Language prefs — visible on idle and preview */}
        {(uiState === "idle" || uiState === "preview") && (
          <div className="mb-5">
            <PrefsSelector
              persona={persona}
              language={language}
              onPersona={setPersona}
              onLanguage={setLanguage}
              disabled={false}
            />
          </div>
        )}

        {/* IDLE — upload zone */}
        {uiState === "idle" && <UploadZone onFile={handleFile} />}

        {/* PREVIEW — image shown, ready to analyse */}
        {(uiState === "preview" || uiState === "result" || uiState === "loading") && dataUrl && (
          <div className="mb-5">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dataUrl}
                alt="Uploaded chemistry question"
                className="w-full max-h-72 object-contain bg-slate-50"
              />
            </div>

            {uiState === "preview" && (
              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleAnalyse}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm py-3 rounded-xl transition-colors"
                >
                  🔍 Analyse with AI Mentor
                </button>
                <button
                  onClick={handleReset}
                  className="border border-slate-200 bg-white text-slate-500 text-sm font-semibold px-4 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        )}

        {/* LOADING */}
        {uiState === "loading" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Analysing your image…</p>
          </div>
        )}

        {/* RESULT — mentor panel */}
        {uiState === "result" && response && (
          <div className="space-y-4">
            <MentorPanel response={response} persona={persona} language={language} />
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 border border-slate-200 bg-white text-slate-600 font-bold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Upload Another Image
              </button>
            </div>
          </div>
        )}

        {/* ERROR */}
        {uiState === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-sm font-bold text-red-700 mb-2">Analysis failed</p>
            <p className="text-xs text-slate-500 mb-4">{errorMsg}</p>
            <button
              onClick={handleReset}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
