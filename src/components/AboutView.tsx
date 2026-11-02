import React from 'react';
import {
  Award,
  BookOpen,
  Code2,
  FileText,
  Globe2,
  Layers,
  Scale,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-8 py-2">
      {/* Hero Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#1779B8] font-bold">
          <span>AI SANSAD ROUND 2</span>
          <span aria-hidden="true">·</span>
          <span>ACADEMIC AI COMPETITION</span>
          <span aria-hidden="true">·</span>
          <span>PROJECT DOSSIER</span>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102B46]">
            TerraScope AI
          </h2>
          <p className="text-base text-[#1779B8] font-medium mt-0.5">
            Turning Satellite Pixels into Planning Insights.
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-3xl">
          TerraScope AI is an academic machine learning prototype built for Round 2 of the AI Sansad competition. The system is engineered to perform automated first-pass classification of satellite-image tiles into standardized land-use categories, equipping urban planners, regional authorities, and conservation researchers with actionable spatial insights.
        </p>
      </div>

      {/* Structured Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Problem Statement & Objective */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Globe2 className="w-4 h-4 text-[#1779B8]" />
            <h3 className="text-sm font-bold text-[#102B46] uppercase tracking-wider">
              Problem & Objective
            </h3>
          </div>

          <div className="space-y-3 text-xs text-slate-700">
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">The Problem Statement:</span>
              <p className="leading-relaxed text-slate-600">
                Train a model to classify satellite imagery into different land-use types to support sustainable land-planning decisions. Rapid urban sprawl, agricultural parcel shifting, and ecological encroachment demand rapid, reproducible inventorying.
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-0.5">The Core Objective:</span>
              <p className="leading-relaxed text-slate-600">
                Assist human reviewers with consistent first-pass categorization of satellite-image tiles, automatically routing uncertain or low-confidence tiles to human spatial analysts while expediting straightforward tiles.
              </p>
            </div>
          </div>
        </div>

        {/* Technical Stack & Architecture */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Code2 className="w-4 h-4 text-[#1779B8]" />
            <h3 className="text-sm font-bold text-[#102B46] uppercase tracking-wider">
              System Architecture
            </h3>
          </div>

          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-slate-900 shrink-0">Frontend:</span>
              <span>React 19, TypeScript, Tailwind CSS v4, Lucide geospatial iconography</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-slate-900 shrink-0">Model Training:</span>
              <span>TensorFlow / Keras in Google Colab (Custom CNN & MobileNetV2 benchmarks)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-slate-900 shrink-0">Data Integrity:</span>
              <span>Zero fabricated evaluation metrics; honest "Awaiting dataset" states</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-slate-900 shrink-0">Inference Adapter:</span>
              <span>Pluggable bridge ready for REST inference or browser-side TF.js weights</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-slate-900 shrink-0">Security & Privacy:</span>
              <span>No mandatory external APIs, no hardcoded API keys, browser-side memory caching</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Mandatory Decision-Support Limitation Notice */}
      <div className="p-6 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-700" />
          <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wide">
            Mandatory Decision-Support Limitation Notice
          </h3>
        </div>

        <p className="text-xs text-amber-900 leading-relaxed font-medium">
          TerraScope AI is an academic prototype engineered strictly for <strong>decision support and exploratory triage</strong>. It does not constitute a replacement for professional ground-truthed cartographic assessments, certified land-surveying, or statutory municipal zoning declarations.
        </p>

        <p className="text-xs text-amber-800 leading-relaxed">
          All model outputs represent uncalibrated statistical model scores derived from aerial reflectance values and must be evaluated alongside cadastral maps, local zoning bylaws, and field inspections before regulatory action is taken.
        </p>
      </div>

      {/* Competition Metadata Footnote */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#102B46]" />
          <span>Prepared for AI Sansad Round 2 Academic AI Competition</span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Architecture Version 1.0.0-academic
        </div>
      </div>
    </div>
  );
};
