import React, { useState } from 'react';
import { Plus, RotateCcw, Sliders, Trash2, X } from 'lucide-react';
import { INITIAL_LAND_USE_CLASSES, POTENTIAL_ADDITIONAL_CLASSES } from '../data/defaultClasses';
import { LandUseClass } from '../types/prediction';

interface ClassManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: LandUseClass[];
  onSaveClasses: (classes: LandUseClass[]) => void;
  reviewThreshold: number;
  onSaveThreshold: (threshold: number) => void;
}

export const ClassManagerModal: React.FC<ClassManagerModalProps> = ({
  isOpen,
  onClose,
  classes,
  onSaveClasses,
  reviewThreshold,
  onSaveThreshold,
}) => {
  const [localClasses, setLocalClasses] = useState<LandUseClass[]>(classes);
  const [localThreshold, setLocalThreshold] = useState<number>(reviewThreshold);

  // New Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [newClassColor, setNewClassColor] = useState('#2563EB');

  if (!isOpen) return null;

  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    const newClass: LandUseClass = {
      id: `custom_${Date.now()}`,
      name: newClassName.trim(),
      description: newClassDesc.trim() || 'Custom competition land-use category',
      colorHex: newClassColor,
    };
    const updated = [...localClasses, newClass];
    setLocalClasses(updated);
    setNewClassName('');
    setNewClassDesc('');
  };

  const handleQuickAdd = (suggested: LandUseClass) => {
    if (localClasses.some((c) => c.name.toLowerCase() === suggested.name.toLowerCase())) return;
    setLocalClasses([...localClasses, suggested]);
  };

  const handleRemoveClass = (id: string) => {
    if (localClasses.length <= 2) {
      alert('A classification problem requires at least two target classes.');
      return;
    }
    setLocalClasses(localClasses.filter((c) => c.id !== id));
  };

  const handleResetDefaults = () => {
    setLocalClasses(INITIAL_LAND_USE_CLASSES);
    setLocalThreshold(0.70);
  };

  const handleSaveAll = () => {
    onSaveClasses(localClasses);
    onSaveThreshold(localThreshold);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-[#102B46]">
              Dynamic Class Taxonomy & Threshold
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Adapt labels and confidence thresholds once the official AI Sansad competition dataset is announced.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Human Review Threshold Slider */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Human Review Score Threshold:
            </span>
            <span className="font-mono text-sm font-bold text-[#1779B8]">
              {localThreshold.toFixed(2)} ({(localThreshold * 100).toFixed(0)}%)
            </span>
          </div>

          <input
            type="range"
            min="0.50"
            max="0.95"
            step="0.05"
            value={localThreshold}
            onChange={(e) => setLocalThreshold(parseFloat(e.target.value))}
            className="w-full accent-[#1779B8] cursor-pointer"
          />

          <div className="flex justify-between text-[11px] text-slate-500">
            <span>0.50 (Permissive)</span>
            <span>Default: 0.70 (Standard)</span>
            <span>0.95 (High Caution)</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-tight">
            Any uncalibrated top model score falling below this threshold will be flagged for human review in the review queue.
          </p>
        </div>

        {/* Active Class List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Active Taxonomy ({localClasses.length} Classes)
            </span>
            <button
              onClick={handleResetDefaults}
              className="text-xs text-slate-500 hover:text-[#1779B8] flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset Defaults
            </button>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
            {localClasses.map((cls) => (
              <div
                key={cls.id}
                className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div
                    className="w-3.5 h-3.5 rounded-xs shrink-0"
                    style={{ backgroundColor: cls.colorHex }}
                  />
                  <div className="overflow-hidden">
                    <span className="font-semibold text-slate-900 block truncate">
                      {cls.name}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate block">
                      {cls.description}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveClass(cls.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                  title="Remove class"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Add Preset Classes */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">
            Suggested Earth-Observation Classes:
          </span>
          <div className="flex flex-wrap gap-2">
            {POTENTIAL_ADDITIONAL_CLASSES.map((sug) => {
              const alreadyHas = localClasses.some(
                (c) => c.name.toLowerCase() === sug.name.toLowerCase()
              );
              return (
                <button
                  key={sug.id}
                  disabled={alreadyHas}
                  onClick={() => handleQuickAdd(sug)}
                  className={`px-2.5 py-1 text-xs rounded-md border flex items-center gap-1.5 transition-colors ${
                    alreadyHas
                      ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'
                      : 'border-slate-300 text-slate-700 bg-white hover:border-[#1779B8] hover:text-[#1779B8]'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  {sug.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Class Form */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
          <span className="font-semibold text-slate-800 block">
            Add Custom Land-Use Class
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. Mangrove / Wetland"
              className="p-2 rounded-lg border border-slate-300 bg-white sm:col-span-2 text-xs"
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newClassColor}
                onChange={(e) => setNewClassColor(e.target.value)}
                className="w-9 h-8 p-0.5 rounded-lg border border-slate-300 bg-white cursor-pointer"
                title="Pick marker color"
              />
              <span className="font-mono text-[11px] text-slate-500">{newClassColor}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newClassDesc}
              onChange={(e) => setNewClassDesc(e.target.value)}
              placeholder="Description (optional)"
              className="flex-1 p-2 rounded-lg border border-slate-300 bg-white text-xs"
            />
            <button
              onClick={handleAddClass}
              disabled={!newClassName.trim()}
              className="px-3 py-2 rounded-lg bg-[#102B46] hover:bg-[#1779B8] disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold text-xs transition-colors shrink-0"
            >
              Add Class
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAll}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#102B46] text-white hover:bg-[#1779B8] transition-colors shadow-xs"
          >
            Save Taxonomy & Threshold
          </button>
        </div>
      </div>
    </div>
  );
};
