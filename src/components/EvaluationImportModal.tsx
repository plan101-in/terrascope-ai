import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Copy,
  Database,
  FileCode,
  Info,
  RotateCcw,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { EvaluationImportData } from '../types/prediction';
import { SAMPLE_EVALUATION_TEMPLATE, validateEvaluationJson } from '../utils/evaluationValidator';

interface EvaluationImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: EvaluationImportData) => Promise<void>;
}

export const EvaluationImportModal: React.FC<EvaluationImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleValidateAndImport = async () => {
    setError(null);
    const result = validateEvaluationJson(jsonText);
    if (!result.valid || !result.data) {
      setError(result.error || 'Failed to validate JSON.');
      return;
    }
    setIsSaving(true);
    try {
      await onImport(result.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cloud save failed. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadTemplate = () => {
    setJsonText(SAMPLE_EVALUATION_TEMPLATE);
    setError(null);
  };

  const handleClear = () => {
    setJsonText('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#1779B8]" />
              <h3 className="text-lg font-bold text-[#102B46]">
                Import Colab Evaluation Results
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste JSON results exported from your Google Colab training notebook.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-slate-700 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-[#102B46]">
            <Info className="w-4 h-4 text-[#1779B8] shrink-0" />
            <span>Validated Import & Cloud Persistence</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            JSON is validated in the browser, then saved to your authenticated Supabase account. It will reload on your next visit; unsuccessful saves remain open for retry.
          </p>
        </div>

        {/* Text Area Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-800">
              Evaluation JSON Payload
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadTemplate}
                className="text-[#1779B8] hover:text-[#102B46] font-medium flex items-center gap-1 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Load Format Template</span>
              </button>
              {jsonText && (
                <>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-slate-500 hover:text-rose-600 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              if (error) setError(null);
            }}
            rows={11}
            placeholder={`Paste your JSON evaluation results here...
Example schema fields:
{
  "project": "TerraScope AI",
  "practice_mode": true,
  "model_name": "baseline_cnn",
  "classes": ["agriculture", "built_up", "forest", "water"],
  "dataset": { "train_images": 100, "validation_images": 24, "test_images": 20 },
  "metrics": { "accuracy": 0.95, "macro_f1": 0.94 },
  "confusion_matrix": [[5,0,0,0], [0,5,0,0], [0,0,5,0], [0,0,0,5]],
  "model_comparison": [{ "model": "baseline_cnn", "val_accuracy": 0.95, "val_macro_f1": 0.94 }]
}`}
            className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#1779B8] leading-relaxed"
          />
        </div>

        {/* Validation Error Alert */}
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Validation Failed:</span>
              <p className="text-[11px] text-rose-700 leading-normal">{error}</p>
            </div>
          </div>
        )}

        {/* Practice Mode Warning Note */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
          <strong>Validation Rules:</strong> Numerical metrics must lie between 0.0 and 1.0. The confusion matrix dimensions must strictly equal the number of listed classes ($N \times N$). Synthetic runs must set <code className="font-mono text-slate-700">"practice_mode": true</code>.
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleValidateAndImport}
            disabled={!jsonText.trim() || isSaving}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#102B46] text-white hover:bg-[#1779B8] disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors shadow-xs"
          >
            {isSaving ? 'Saving to Cloud…' : 'Validate & Import Results'}
          </button>
        </div>
      </div>
    </div>
  );
};
