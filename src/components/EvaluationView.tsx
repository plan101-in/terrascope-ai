import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  FileCheck,
  Grid,
  Info,
  Layers,
  LineChart,
  RotateCcw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { EvaluationImportData, LandUseClass } from '../types/prediction';
import { EvaluationImportModal } from './EvaluationImportModal';

interface EvaluationViewProps {
  classes: LandUseClass[];
  importedData: EvaluationImportData | null;
  onImportData: (data: EvaluationImportData) => Promise<void>;
  onClearData: () => void;
}

export const EvaluationView: React.FC<EvaluationViewProps> = ({
  classes,
  importedData,
  onImportData,
  onClearData,
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedModelArchitecture, setSelectedModelArchitecture] = useState<'mobilenet' | 'custom_cnn'>('mobilenet');

  // Compute per-class precision, recall, and F1 from confusion matrix if available
  const perClassMetrics = React.useMemo(() => {
    if (!importedData || !importedData.confusion_matrix) return null;

    const matrix = importedData.confusion_matrix;
    const classList = importedData.classes;
    const n = classList.length;

    return classList.map((clsName, i) => {
      const tp = matrix[i][i] || 0;
      let fp = 0;
      for (let r = 0; r < n; r++) {
        if (r !== i) fp += matrix[r][i] || 0;
      }
      let fn = 0;
      for (let c = 0; c < n; c++) {
        if (c !== i) fn += matrix[i][c] || 0;
      }
      const totalTest = tp + fn;
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      return {
        className: clsName,
        testCount: totalTest,
        tp,
        fp,
        fn,
        precision,
        recall,
        f1,
      };
    });
  }, [importedData]);

  // Display classes: use imported class names if present, else default classes
  const activeClassNames = importedData ? importedData.classes : classes.map((c) => c.name);

  return (
    <div className="space-y-8 py-2">
      {/* Top Banner: Controls, Academic Integrity & Import State */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Model Performance & Validation Suite</span>
            <span aria-hidden="true">·</span>
            <span>AI Sansad Round 2</span>
          </div>

          <div className="flex items-center gap-2">
            {importedData ? (
              <>
                <button
                  onClick={onClearData}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Remove imported evaluation results and restore empty states"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Imported Results</span>
                </button>

                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#102B46] hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#1779B8]" />
                  <span>Re-Import JSON</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#102B46] hover:bg-[#1779B8] rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-[#DCEFFB]" />
                <span>Import Colab Evaluation Results</span>
              </button>
            )}
          </div>
        </div>

        {/* Practice Mode vs Official Dataset Run Banner */}
        {importedData ? (
          importedData.practice_mode ? (
            /* Warning 7: Practice Mode Banner */
            <div className="p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500 text-amber-950 space-y-1.5">
              <div className="flex items-center gap-2 font-mono font-bold text-sm text-amber-900 tracking-wide">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>PRACTICE RUN — SYNTHETIC DATA. NOT VALID COMPETITION RESULTS.</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                These figures reflect synthetic or rehearsal data from model <code className="font-mono font-bold">{importedData.model_name}</code> for software testing. They must not be cited as real competition performance benchmarks.
              </p>
            </div>
          ) : (
            /* Requirement 8: Official Dataset Run Banner */
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1">
              <div className="flex items-center gap-2 font-mono font-bold text-xs text-emerald-900 tracking-wide">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>OFFICIAL-DATASET RUN</span>
                <span className="text-slate-400 font-sans font-normal">·</span>
                <span className="font-sans text-emerald-800 text-xs font-normal">
                  Self-reported model evaluation on official test partition for <strong className="font-mono">{importedData.model_name}</strong>; not independently verified.
                </span>
              </div>
              <p className="text-[11px] text-emerald-800/90 leading-normal">
                Results populated directly from Colab test split execution ({importedData.dataset.test_images} test tiles across {importedData.classes.length} classes).
              </p>
            </div>
          )
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#102B46]">
                Quantitative Evaluation & Benchmarks
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                In accordance with competition rules and academic evaluation standards, <strong>no fabricated or synthetic benchmark numbers are rendered in this dashboard</strong>. The sections below are architected to ingest and display verified test-split metrics once the Google Colab model finishes training on the official AI Sansad competition dataset.
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 shrink-0">
              Awaiting Official Dataset
            </span>
          </div>
        )}

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#1779B8] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-slate-900">
              Evaluation Protocol Definition:
            </span>
            <p className="text-slate-600 leading-relaxed">
              When the official dataset is released, a stratified test partition is held out strictly during training. Inference is run once on the frozen model weights to compute unbiased Top-1 Accuracy, Macro-F1, per-class Precision/Recall, and the complete confusion matrix.
            </p>
          </div>
        </div>
      </div>

      {/* Dataset Partition Counts (Populated on import) */}
      {importedData && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#1779B8]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Imported Dataset Partitions ({importedData.model_name})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Total Dataset Volume: {importedData.dataset.train_images + importedData.dataset.validation_images + importedData.dataset.test_images} Images
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Training Set</span>
              <span className="text-xl font-bold font-mono text-slate-900">
                {importedData.dataset.train_images}
              </span>
              <span className="text-[11px] text-slate-500 ml-1">images (70% split)</span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Validation Set</span>
              <span className="text-xl font-bold font-mono text-slate-900">
                {importedData.dataset.validation_images}
              </span>
              <span className="text-[11px] text-slate-500 ml-1">images (15% split)</span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#DCEFFB]/40 border border-[#1779B8]/30">
              <span className="text-[11px] text-[#1779B8] font-bold block">Held-Out Test Set</span>
              <span className="text-xl font-bold font-mono text-[#102B46]">
                {importedData.dataset.test_images}
              </span>
              <span className="text-[11px] text-slate-600 ml-1">images (evaluated split)</span>
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Top-1 Accuracy */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Overall Top-1 Accuracy</span>
            <Scale className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-1">
            <div className={`text-2xl font-bold font-mono tabular-nums ${importedData ? 'text-slate-900' : 'text-slate-400'}`}>
              {importedData ? `${(importedData.metrics.accuracy * 100).toFixed(1)} %` : '--.- %'}
            </div>
            <div className="text-xs font-medium flex items-center gap-1">
              {importedData ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Imported Colab Metric
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Awaiting official test split
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            Ratio of correctly classified tiles over total test sample population.
          </p>
        </div>

        {/* Metric 2: Macro-F1 Score */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Macro-F1 Score</span>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-1">
            <div className={`text-2xl font-bold font-mono tabular-nums ${importedData ? 'text-slate-900' : 'text-slate-400'}`}>
              {importedData ? importedData.metrics.macro_f1.toFixed(4) : '0.----'}
            </div>
            <div className="text-xs font-medium flex items-center gap-1">
              {importedData ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Primary selection metric
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Primary selection metric
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            Unweighted harmonic mean across classes, penalizing poor performance on minority land types.
          </p>
        </div>

        {/* Metric 3: Test Sample Volume / Model Target */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Test Sample Count</span>
            <AlertCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-1">
            <div className={`text-2xl font-bold font-mono tabular-nums ${importedData ? 'text-slate-900' : 'text-slate-400'}`}>
              {importedData ? `${importedData.dataset.test_images} tiles` : '-- tiles'}
            </div>
            <div className="text-xs text-slate-600 font-medium flex items-center gap-1">
              {importedData ? `${importedData.classes.length} classes evaluated` : 'Threshold set at < 0.70'}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            Sample population evaluated in held-out test split.
          </p>
        </div>

        {/* Metric 4: Evaluated Model */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Evaluated Model</span>
            <Cpu className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-1">
            <div className={`text-xl font-bold font-mono truncate ${importedData ? 'text-slate-900' : 'text-slate-400'}`}>
              {importedData ? importedData.model_name : 'Pending Run'}
            </div>
            <div className="text-xs text-slate-600 font-medium">
              {importedData ? (importedData.practice_mode ? 'Practice Run' : 'Official Partition') : 'GPU / T4 Benchmarking'}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            Architecture identifier exported from Colab notebook.
          </p>
        </div>
      </div>

      {/* Per-Class Precision & Recall Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#102B46]">
              Per-Class Precision, Recall & F1 Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              {importedData
                ? `Computed strictly from imported confusion matrix (${importedData.classes.length} classes).`
                : 'Evaluation structure for dynamic classes. Automatically populates once test inference logs are imported.'}
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Formula: Precision = TP / (TP + FP) · Recall = TP / (TP + FN)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="py-2.5 px-3">Land-Use Class</th>
                <th className="py-2.5 px-3">Test Tiles Count</th>
                <th className="py-2.5 px-3">Precision</th>
                <th className="py-2.5 px-3">Recall</th>
                <th className="py-2.5 px-3">F1-Score</th>
                <th className="py-2.5 px-3">Validation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {perClassMetrics ? (
                perClassMetrics.map((row) => (
                  <tr key={row.className} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-slate-900 capitalize">
                      {row.className.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 tabular-nums">
                      {row.testCount}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-900 font-medium tabular-nums">
                      {(row.precision * 100).toFixed(1)} %
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-900 font-medium tabular-nums">
                      {(row.recall * 100).toFixed(1)} %
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-900 font-medium tabular-nums">
                      {row.f1.toFixed(4)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified via Matrix
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-xs shrink-0"
                          style={{ backgroundColor: cls.colorHex }}
                        />
                        <span className="font-semibold text-slate-900">{cls.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      Pending test split
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 font-medium">
                      --.-- %
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 font-medium">
                      --.-- %
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 font-medium">
                      0.----
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-500 font-medium">
                        Awaiting Ground-Truth Labels
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confusion Matrix Architecture Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#102B46]">
                Confusion Matrix {importedData ? `(${importedData.classes.length} × ${importedData.classes.length})` : 'Structure'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rows = Ground Truth (Actual) · Columns = Model Prediction.
              </p>
            </div>
            <Grid className="w-4 h-4 text-slate-400" />
          </div>

          <div className="overflow-x-auto py-2">
            <div className="min-w-[340px]">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `minmax(70px, 1fr) repeat(${activeClassNames.length}, minmax(55px, 1fr))`,
                }}
              >
                {/* Header corner */}
                <div className="p-2 text-[10px] font-mono font-bold text-slate-500 border border-slate-200 bg-slate-100 flex items-center justify-center">
                  Actual \ Pred
                </div>
                {activeClassNames.map((colName) => (
                  <div
                    key={`col-${colName}`}
                    className="p-2 text-[10px] font-bold text-slate-800 border border-slate-200 bg-slate-100 text-center truncate capitalize"
                    title={colName}
                  >
                    {colName.replace(/_/g, ' ')}
                  </div>
                ))}

                {/* Matrix rows */}
                {activeClassNames.map((rowName, rIdx) => (
                  <React.Fragment key={`row-${rowName}`}>
                    <div
                      className="p-2 text-[10px] font-bold text-slate-800 border border-slate-200 bg-slate-100 flex items-center truncate capitalize"
                      title={rowName}
                    >
                      {rowName.replace(/_/g, ' ')}
                    </div>
                    {activeClassNames.map((colName, cIdx) => {
                      const isDiagonal = rIdx === cIdx;
                      const cellValue = importedData ? importedData.confusion_matrix[rIdx][cIdx] : (isDiagonal ? 'TP' : '0');
                      return (
                        <div
                          key={`cell-${rIdx}-${cIdx}`}
                          className={`p-3 text-xs font-mono text-center border border-slate-200 flex items-center justify-center tabular-nums ${
                            isDiagonal
                              ? 'bg-[#DCEFFB]/70 font-bold text-[#102B46]'
                              : cellValue !== 0 && cellValue !== '0'
                              ? 'bg-rose-50 text-rose-800 font-semibold'
                              : 'bg-white text-slate-400'
                          }`}
                        >
                          {cellValue}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Diagonal cells highlighted in blue represent True Positives (TP).</span>
            <span className="font-mono text-slate-700">
              {importedData ? `Sum = ${importedData.dataset.test_images} test tiles` : 'Awaiting imported evaluation'}
            </span>
          </div>
        </div>

        {/* Training vs Validation Curves Architecture */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#102B46]">
                Training vs. Validation Curves
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Epoch progression monitor (Loss & Categorical Cross-Entropy).
              </p>
            </div>
            <LineChart className="w-4 h-4 text-slate-400" />
          </div>

          {/* Placeholder Graph Frame */}
          <div className="h-52 rounded-lg bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center space-y-2">
            <LineChart className="w-8 h-8 text-slate-400" />
            <div className="text-xs font-semibold text-slate-700">
              Awaiting Colab History Logs
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs leading-normal">
              Training and validation curves (Loss and Accuracy vs. Epochs 1..50) will plot here once Keras training outputs are exported.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 font-medium">Overfitting Detection:</span>
              <div className="text-slate-800 text-[11px]">
                EarlyStopping on validation loss (patience=5 epochs)
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 font-medium">Learning Rate Scheduler:</span>
              <div className="text-slate-800 text-[11px]">
                ReduceLROnPlateau (factor=0.2, min_lr=1e-6)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Selection & Comparison Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#102B46]">
              Model Comparison & Candidate Benchmarks
            </h3>
            <p className="text-xs text-slate-500">
              {importedData && importedData.model_comparison && importedData.model_comparison.length > 0
                ? 'Populated with imported model comparison runs.'
                : 'Comparative evaluation framework between Custom Baseline CNN and MobileNetV2.'}
            </p>
          </div>
          {importedData && importedData.model_comparison && (
            <span className="text-xs font-mono font-semibold text-[#1779B8]">
              {importedData.model_comparison.length} Models Benchmarked
            </span>
          )}
        </div>

        {importedData && importedData.model_comparison && importedData.model_comparison.length > 0 ? (
          /* Populated Model Comparison Table & Cards */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {importedData.model_comparison.map((m, idx) => (
                <div
                  key={m.model}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#1779B8]">
                      CANDIDATE {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">Colab Export</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 font-mono">
                    {m.model}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Val Accuracy</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {(m.val_accuracy * 100).toFixed(1)} %
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Val Macro-F1</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {m.val_macro_f1.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Standard Unpopulated Architecture Comparison Plan */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Candidate A */}
            <div
              onClick={() => setSelectedModelArchitecture('custom_cnn')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedModelArchitecture === 'custom_cnn'
                  ? 'border-[#1779B8] bg-[#DCEFFB]/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#1779B8]">
                  CANDIDATE 01
                </span>
                <span className="text-xs font-mono text-slate-500">~2.8M params</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mt-1">
                Custom Baseline CNN
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                4 sequential Conv2D blocks (32, 64, 128, 256 filters) with Batch Normalization, Max Pooling, and Spatial Dropout. Trained from scratch on normalized satellite tiles.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                Pros: Lightweight footprint, fast CPU inference, zero ImageNet bias.
              </div>
            </div>

            {/* Candidate B */}
            <div
              onClick={() => setSelectedModelArchitecture('mobilenet')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedModelArchitecture === 'mobilenet'
                  ? 'border-[#1779B8] bg-[#DCEFFB]/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#1779B8]">
                  CANDIDATE 02 (RECOMMENDED)
                </span>
                <span className="text-xs font-mono text-slate-500">~3.5M params</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mt-1">
                MobileNetV2 (Transfer Learning)
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Pre-trained inverted residual bottleneck feature extractor with fine-tuned top dense classification layers and global average pooling.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                Pros: Superior generalizability, inverted residual blocks, highly sample-efficient.
              </div>
            </div>
          </div>
        )}

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <strong>Selection Rule:</strong> The winning architecture will be chosen primarily on validation Macro-F1 score on the competition split. In the event of a statistical tie (Δ &lt; 0.01 F1), the architecture with lower parameter complexity and lower inference latency will be designated for deployment.
        </div>
      </div>

      {/* Import Modal */}
      <EvaluationImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={onImportData}
      />
    </div>
  );
};
