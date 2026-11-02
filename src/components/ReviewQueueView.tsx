import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { LandUseClass, QueueItem } from '../types/prediction';

interface ReviewQueueViewProps {
  realQueue: QueueItem[];
  exampleQueue: QueueItem[];
  classes: LandUseClass[];
  reviewThreshold: number;
  onUpdateStatus: (
    id: string,
    isExample: boolean,
    status: 'pending' | 'flagged' | 'approved' | 'reclassified',
    humanClass?: string,
    notes?: string
  ) => Promise<void>;
  onRemoveItem: (id: string, isExample: boolean) => Promise<void>;
  onClearQueue: (isExample: boolean) => Promise<void>;
  onSelectClassificationTile: (item: QueueItem) => void;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  realQueue,
  exampleQueue,
  classes,
  reviewThreshold,
  onUpdateStatus,
  onRemoveItem,
  onClearQueue,
  onSelectClassificationTile,
}) => {
  const [activeQueueTab, setActiveQueueTab] = useState<'example' | 'real'>('example');
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editClass, setEditClass] = useState('');

  const currentItems = activeQueueTab === 'real' ? realQueue : exampleQueue;

  const handleOpenDetailModal = (item: QueueItem) => {
    setSelectedItem(item);
    setEditNotes(item.reviewerNotes || '');
    setEditClass(item.humanAssignedClass || item.predictedClass);
  };

  const handleSaveModal = async (status: 'approved' | 'flagged' | 'reclassified') => {
    if (!selectedItem) return;
    try {
      await onUpdateStatus(selectedItem.id, selectedItem.isExample, status, editClass, editNotes);
      setSelectedItem(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Review change could not be saved.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Type', 'PredictedClass', 'ModelScore', 'Threshold', 'ReviewStatus', 'HumanAssignedClass', 'ReviewerNotes', 'Timestamp'];
    const rows = currentItems.map((i) => [
      i.id,
      i.isExample ? 'EXAMPLE_FIXTURE' : 'REAL_INFERENCE',
      i.predictedClass,
      i.modelScore.toFixed(3),
      i.scoreThresholdUsed.toFixed(2),
      i.reviewStatus || 'pending',
      i.humanAssignedClass || 'none',
      `"${(i.reviewerNotes || '').replace(/"/g, '""')}"`,
      i.timestamp,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `terrascope_${activeQueueTab}_review_queue.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 py-2">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Human-In-The-Loop Oversight</span>
            <span aria-hidden="true">·</span>
            <span>Threshold Gate: {(reviewThreshold * 100).toFixed(0)}%</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#102B46]">
            Land Planner Review Queue
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl mt-0.5">
            Predictions scoring below the uncalibrated {reviewThreshold.toFixed(2)} confidence threshold are held in this queue for human verification. In accordance with honest evaluation practices, example items are strictly quarantined from real records.
          </p>
        </div>

        {currentItems.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Queue CSV
            </button>
            <button
              onClick={() => onClearQueue(activeQueueTab === 'example').catch(err => window.alert(err.message))}
              className="px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
            >
              Clear Tab
            </button>
          </div>
        )}
      </div>

      {/* Queue Quarantine Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveQueueTab('example')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeQueueTab === 'example'
              ? 'bg-[#102B46] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Illustrative Example Queue</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
            {exampleQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveQueueTab('real')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeQueueTab === 'real'
              ? 'bg-[#102B46] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Real Submissions Queue</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
            {realQueue.length}
          </span>
        </button>
      </div>

      {/* Quarantined Notice for Active Tab */}
      {activeQueueTab === 'example' ? (
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-300/60 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Quarantined Fixture Storage:</strong> Items in this queue are mock illustrative results generated for testing human review workflows. They are strictly isolated and never mixed with real model validation splits.
          </span>
        </div>
      ) : (
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1779B8] shrink-0 mt-0.5" />
          <span>
            <strong>Real Model Inference Queue:</strong> This queue receives tiles processed by the TensorFlow Lite model. Predictions scoring below the uncalibrated {reviewThreshold.toFixed(2)} threshold or sent by planners appear here automatically for human verification.
          </span>
        </div>
      )}

      {/* Queue Content Table */}
      {currentItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800">
            Queue is Empty
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeQueueTab === 'real'
              ? 'Classify an image using the connected TensorFlow Lite model on the Classification tab. Predictions scoring below threshold or added to queue will appear here.'
              : 'Generate an illustrative example on the Classification tab and click "Send to Review Queue" to test the review workflow.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-3 px-4">Tile</th>
                  <th className="py-3 px-4">Predicted Class</th>
                  <th className="py-3 px-4">Uncalibrated Score</th>
                  <th className="py-3 px-4">Threshold Flag</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4">Human Class</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.map((item) => {
                  const isFlagged = item.modelScore < item.scoreThresholdUsed;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Image Preview */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageMetadata.dataUrl}
                            alt={item.imageMetadata.name}
                            className="w-11 h-11 object-cover rounded-md border border-slate-200 shrink-0 bg-slate-100"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                            }}
                          />
                          <div className="overflow-hidden max-w-[160px]">
                            <div className="font-medium text-slate-900 truncate">
                              {item.imageMetadata.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {item.imageMetadata.width}×{item.imageMetadata.height}px
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">
                          {item.predictedClass}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-900 font-bold tabular-nums">
                          {item.modelScore.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">/ 1.00</span>
                      </td>

                      {/* Flag */}
                      <td className="py-3 px-4">
                        {isFlagged ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            &lt; {item.scoreThresholdUsed.toFixed(2)} (Review Required)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Pass (&ge; {item.scoreThresholdUsed.toFixed(2)})
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className="capitalize font-medium text-slate-700">
                          {item.reviewStatus || 'pending'}
                        </span>
                      </td>

                      {/* Human Class */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-600">
                          {item.humanAssignedClass || '—'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onSelectClassificationTile(item)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium text-[#1779B8] hover:text-[#102B46] hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Inspect in Classifier"
                          >
                            <span>Inspect</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleOpenDetailModal(item)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#102B46] text-white hover:bg-[#1779B8] transition-colors cursor-pointer"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => onRemoveItem(item.id, item.isExample).catch(err => window.alert(err.message))}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove from queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#1779B8] uppercase">
                  PLANNER VERIFICATION PROTOCOL
                </span>
                <h3 className="text-lg font-bold text-[#102B46]">
                  Inspect Land-Use Tile
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image & Score Breakdown */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <img
                src={selectedItem.imageMetadata.dataUrl}
                alt={selectedItem.imageMetadata.name}
                className="w-full sm:w-44 h-44 object-cover rounded-xl border border-slate-200 shrink-0 bg-slate-100"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="176" height="176" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                }}
              />

              <div className="space-y-2 text-xs flex-1">
                <div>
                  <span className="text-slate-400">File:</span>
                  <div className="font-semibold text-slate-800 break-all">
                    {selectedItem.imageMetadata.name}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Predicted Class:</span>
                    <span className="font-bold text-slate-900">{selectedItem.predictedClass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Uncalibrated Score:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedItem.modelScore.toFixed(2)} / 1.00
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Threshold:</span>
                    <span className="font-mono text-slate-700">
                      {selectedItem.scoreThresholdUsed.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  {selectedItem.modelScore < selectedItem.scoreThresholdUsed
                    ? '⚠️ Low confidence: Top score is below 0.70 threshold. Human verification required before inclusion in planning register.'
                    : '✅ Confidence threshold met. Confirm or adjust classification below.'}
                </div>
              </div>
            </div>

            {/* Class Assignment Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Confirmed Human Land-Use Class
              </label>
              <select
                value={editClass}
                onChange={(e) => setEditClass(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#1779B8]"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name} — {cls.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Planner Rationale Notes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Planner Rationale / Inspection Notes
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Detail spatial features, canopy boundary, seasonal flooding, or reasons for confirmation/reclassification..."
                className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1779B8]"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
              <button
                onClick={() => {
                  onSelectClassificationTile(selectedItem);
                  setSelectedItem(null);
                }}
                className="px-3 py-2 text-xs font-medium text-[#1779B8] hover:bg-slate-100 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <span>Open in Classifier</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={() => handleSaveModal('flagged')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
                >
                  Flag for Field Visit
                </button>

                <button
                  onClick={() => handleSaveModal(editClass !== selectedItem.predictedClass ? 'reclassified' : 'approved')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#102B46] text-white hover:bg-[#1779B8] transition-colors shadow-xs cursor-pointer"
                >
                  {editClass !== selectedItem.predictedClass ? 'Save Reclassification' : 'Approve Classification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
