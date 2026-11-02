import React from 'react';
import { ArrowRight, Cpu, Database, FileCheck, Layers, ShieldAlert, Sparkles, Upload } from 'lucide-react';
import { EvaluationImportData, LandUseClass, ModelConnectionStatus } from '../types/prediction';
import { ActiveTab } from './Header';

interface DashboardProps {
  onNavigate: (tab: ActiveTab) => void;
  classes: LandUseClass[];
  modelStatus: ModelConnectionStatus;
  isPracticeModel?: boolean;
  reviewThreshold: number;
  onOpenModelModal: () => void;
  onOpenClassModal: () => void;
  importedEvaluation?: EvaluationImportData | null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  classes,
  modelStatus,
  isPracticeModel,
  reviewThreshold,
  onOpenModelModal,
  onOpenClassModal,
  importedEvaluation,
}) => {
  return (
    <div className="space-y-10 py-2">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#102B46] to-[#0A1B2D] text-white rounded-2xl p-8 sm:p-10 shadow-sm relative overflow-hidden border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-[#DCEFFB] tracking-wide">
            <span>AI SANSAD ROUND 2</span>
            <span aria-hidden="true">·</span>
            <span>ACADEMIC AI COMPETITION</span>
            <span aria-hidden="true">·</span>
            <span>LAND-USE INTELLIGENCE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            Turn Satellite Imagery into Land-Use Insights
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
            TerraScope AI classifies earth-observation satellite imagery into distinct land-use categories—such as forest, agriculture, water bodies, and built-up land—to provide reproducible, first-pass categorization for regional spatial planning and conservation oversight.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('classification')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#1779B8] text-white hover:bg-[#136295] transition-colors shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Open Image Classifier
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('methodology')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 transition-colors cursor-pointer"
            >
              View Research Methodology
            </button>
          </div>
        </div>

        {/* Decorative subtle grid background lines */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #DCEFFB 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />
      </section>

      {/* Honest Status Cards Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-[#102B46]">
            System & Competition Readiness
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Updated: Round 2 Preparation Phase
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Model Connection */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Model Connection
                </span>
                <Cpu className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-lg font-bold text-slate-900">
                {modelStatus === 'connected'
                  ? isPracticeModel
                    ? 'Practice Model Connected'
                    : 'Model Connected'
                  : modelStatus === 'connecting'
                  ? 'Connecting...'
                  : 'Not Connected'}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {modelStatus === 'connected'
                  ? isPracticeModel
                    ? 'TensorFlow Lite model verified in-browser via WebAssembly. NOTE: Trained on synthetic practice imagery.'
                    : 'Verified TensorFlow model active in-browser. Ready for live tile classification.'
                  : 'TensorFlow/Keras model pipeline verified in Google Colab. Connect the hosted TFLite model to enable in-browser classification.'}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={onOpenModelModal}
                className="text-xs font-semibold text-[#1779B8] hover:text-[#102B46] transition-colors cursor-pointer"
              >
                Configure Connection →
              </button>
            </div>
          </div>

          {/* Card 2: Dynamic Classes */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Configured Classes
                </span>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {importedEvaluation ? importedEvaluation.classes.length : classes.length} Land-Use Classes
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {importedEvaluation
                  ? `Active classes: ${importedEvaluation.classes.join(', ')}.`
                  : `Initial categories: ${classes.map((c) => c.name).join(', ')}. Dynamic taxonomy allows immediate realignment once dataset labels are confirmed.`}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={onOpenClassModal}
                className="text-xs font-semibold text-[#1779B8] hover:text-[#102B46] transition-colors cursor-pointer"
              >
                Edit Class Taxonomy →
              </button>
            </div>
          </div>

          {/* Card 3: Dataset Status */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Competition Dataset
                </span>
                <Database className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-lg font-bold text-slate-900">
                {importedEvaluation
                  ? `${importedEvaluation.dataset.train_images + importedEvaluation.dataset.validation_images + importedEvaluation.dataset.test_images} Images`
                  : 'Awaiting Release'}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {importedEvaluation
                  ? `Imported split: ${importedEvaluation.dataset.train_images} train / ${importedEvaluation.dataset.validation_images} val / ${importedEvaluation.dataset.test_images} test.`
                  : 'Official AI Sansad Round 2 dataset has not yet been released. Pipeline is structured for standard orthorectified multi-spectral tiles.'}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
              {importedEvaluation ? (importedEvaluation.practice_mode ? 'Practice run partitions' : 'Official test partition') : 'Stratified 70/15/15 split planned'}
            </div>
          </div>

          {/* Card 4: Evaluation Benchmark */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Evaluation Metrics
                </span>
                <FileCheck className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-lg font-bold text-slate-900">
                {importedEvaluation
                  ? (importedEvaluation.practice_mode ? 'Practice Run' : 'Official Run')
                  : 'Awaiting Evaluation'}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {importedEvaluation
                  ? `Accuracy: ${(importedEvaluation.metrics.accuracy * 100).toFixed(1)}% · Macro-F1: ${importedEvaluation.metrics.macro_f1.toFixed(4)} (${importedEvaluation.model_name})`
                  : 'Zero fabricated metrics. Macro-F1, per-class recall, and confusion matrix will be derived from held-out validation splits post-training.'}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => onNavigate('evaluation')}
                className="text-xs font-semibold text-[#1779B8] hover:text-[#102B46] transition-colors cursor-pointer"
              >
                {importedEvaluation ? 'View Imported Split →' : 'Inspect Evaluation Split →'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Workflow Pipeline Section */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#102B46]">
            Architectural Pipeline
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            End-to-end dataflow from raw satellite tile ingestion to human-verified land-use inventory.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* Step 1 */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#1779B8]">STAGE 01</span>
              <Upload className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Satellite Image</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standard true-color multispectral raster tiles (JPG/PNG formats, up to 10MB) ingested via local drop or batch queue.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#1779B8]">STAGE 02</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Preprocessing</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standardized scaling, tensor normalization (min-max [0,1]), uniform spatial cropping to match model input resolution.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#1779B8]">STAGE 03</span>
              <Cpu className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">CNN Classification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Trained TensorFlow/Keras convolutional network generates uncalibrated softmax scores across dynamic land-use taxonomy.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-lg bg-[#DCEFFB]/30 border border-[#1779B8]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#1779B8]">STAGE 04</span>
              <ShieldAlert className="w-4 h-4 text-[#1779B8]" />
            </div>
            <h3 className="text-sm font-semibold text-[#102B46]">Human Review</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Top scores below the {reviewThreshold.toFixed(2)} confidence threshold are automatically flagged for physical planner inspection.
            </p>
          </div>
        </div>

        {/* Limitation notice footnote */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Academic Integrity Notice:</strong> TerraScope AI operates strictly on honest representations. Illustrative fixtures are clearly distinguished from genuine model outputs, and live inference remains locked until a verified Colab model server is connected.
          </span>
        </div>
      </section>
    </div>
  );
};
