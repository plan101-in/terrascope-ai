import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ExternalLink,
  FileCode2,
  Info,
  Radio,
  RefreshCw,
  Sliders,
  X,
  XCircle,
} from 'lucide-react';
import { DEFAULT_METADATA_URL, DEFAULT_TFLITE_URL } from '../services/tfliteService';
import { ModelEndpointConfig } from '../types/prediction';

interface ModelConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ModelEndpointConfig;
  onSaveConfig: (config: ModelEndpointConfig) => void;
  onTestConnection: (url: string) => Promise<{ success: boolean; message: string; modelDetails?: any }>;
  onConnectTFLite?: (modelUrl?: string, metadataUrl?: string) => Promise<{ success: boolean; message: string }>;
  onDisconnectModel?: () => void;
}

export const ModelConnectionModal: React.FC<ModelConnectionModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onTestConnection,
  onConnectTFLite,
  onDisconnectModel,
}) => {
  const [modelUrl, setModelUrl] = useState(config.modelUrl || DEFAULT_TFLITE_URL);
  const [metadataUrl, setMetadataUrl] = useState(config.metadataUrl || DEFAULT_METADATA_URL);
  const [serverUrl, setServerUrl] = useState(config.endpointUrl || '');
  const [isConnectingTFLite, setIsConnectingTFLite] = useState(false);
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleConnectHostedTFLite = async () => {
    if (!onConnectTFLite) return;
    setIsConnectingTFLite(true);
    setFeedback(null);
    try {
      const res = await onConnectTFLite(modelUrl, metadataUrl);
      setFeedback(res);
    } catch (err: any) {
      setFeedback({
        success: false,
        message: err.message || 'Failed to connect to hosted TensorFlow Lite model.',
      });
    } finally {
      setIsConnectingTFLite(false);
    }
  };

  const handleTestServer = async () => {
    setIsTestingServer(true);
    setFeedback(null);
    const res = await onTestConnection(serverUrl);
    setIsTestingServer(false);
    setFeedback(res);
    if (res.success) {
      const details = res.modelDetails || {};
      onSaveConfig({
        status: 'connected',
        endpointUrl: serverUrl,
        modelType: 'keras_rest',
        inputResolution: details.input_resolution || 224,
        lastTested: new Date().toISOString(),
        metadata: {
          modelName: details.model_name || details.model_version || 'external-server',
          inputShape: details.input_shape || [224, 224, 3],
          classes: details.classes,
          normalization: details.normalization || 'zero_to_one',
          framework: details.framework || 'TensorFlow / Keras',
        },
      });
    }
  };

  const handleDisconnect = () => {
    if (onDisconnectModel) {
      onDisconnectModel();
    } else {
      onSaveConfig({
        status: 'disconnected',
        endpointUrl: '',
        modelType: 'tflite_web',
        inputResolution: 160,
        metadata: undefined,
      });
    }
    setFeedback({
      success: true,
      message: 'Model disconnected successfully. Live classification is now disabled.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#1779B8]" />
              <h3 className="text-lg font-bold text-[#102B46]">
                Model Integration Architecture &amp; Status
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              TensorFlow Lite in-browser WebAssembly runtime and model connection.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicator */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            config.status === 'connected'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : config.status === 'connecting'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <Radio
              className={`w-5 h-5 shrink-0 ${
                config.status === 'connected'
                  ? 'text-emerald-600'
                  : config.status === 'connecting'
                  ? 'text-[#1779B8] animate-pulse'
                  : 'text-amber-600'
              }`}
            />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                {config.status === 'connected'
                  ? config.metadata?.practiceMode
                    ? 'STATUS: PRACTICE MODEL CONNECTED'
                    : 'STATUS: MODEL CONNECTED & VERIFIED'
                  : config.status === 'connecting'
                  ? 'STATUS: INITIALIZING TFLITE WASM...'
                  : 'STATUS: MODEL NOT CONNECTED'}
              </div>
              <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {config.status === 'connected' ? (
                  <>
                    Connected to model: <span className="font-mono font-semibold">{config.metadata?.modelName || 'baseline_cnn'}</span> ({config.metadata?.framework || 'TFLite WASM'}).
                    {config.metadata?.practiceMode && (
                      <span className="block text-[11px] text-amber-800 font-medium mt-0.5">
                        Trained on synthetic practice imagery. Predictions are for pipeline validation and not official competition results.
                      </span>
                    )}
                  </>
                ) : config.status === 'connecting' ? (
                  'Fetching model and verifying WebAssembly runtime...'
                ) : (
                  'Model integration pending. Click below to connect the hosted TensorFlow Lite model.'
                )}
              </div>
            </div>
          </div>

          {config.status === 'connected' && (
            <button
              onClick={handleDisconnect}
              className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md cursor-pointer shrink-0 ml-3"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
              feedback.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Section A: GitHub Pages Hosted TensorFlow Lite Model */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-[#102B46]">
              <Cpu className="w-4 h-4 text-[#1779B8] shrink-0" />
              <span>Browser-Based TensorFlow Lite Model (GitHub Pages)</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">
              WASM Engine
            </span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Model Binary URL (.tflite)</label>
              <input
                type="url"
                value={modelUrl}
                onChange={(e) => setModelUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-mono bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1779B8]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Model Metadata URL (.json)</label>
              <input
                type="url"
                value={metadataUrl}
                onChange={(e) => setMetadataUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-mono bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1779B8]"
              />
            </div>

            <div className="pt-1 flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500">
                Loads via <code className="font-mono text-slate-700">@tensorflow/tfjs-tflite</code> WebAssembly runtime with in-browser RGB float32 [0, 255] preprocessing.
              </p>
              <button
                onClick={handleConnectHostedTFLite}
                disabled={isConnectingTFLite || !modelUrl || !metadataUrl}
                className="px-4 py-2 bg-[#102B46] hover:bg-[#1779B8] disabled:bg-slate-300 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shrink-0 disabled:cursor-not-allowed shadow-xs"
              >
                {isConnectingTFLite ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Verifying WASM...
                  </>
                ) : (
                  'Connect & Verify TFLite Model'
                )}
              </button>
            </div>
          </div>

          {/* Connected Model Specifications */}
          {config.status === 'connected' && config.metadata && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-slate-800 font-semibold border-b border-slate-100 pb-1.5">
                <span>Active Model Specifications</span>
                <span className="font-mono text-[11px] text-[#1779B8]">
                  Verified In-Browser
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                <div>
                  <span className="text-slate-400 block">Model Format:</span>
                  <span className="font-mono font-medium text-slate-900">TensorFlow Lite</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Input Shape:</span>
                  <span className="font-mono font-medium text-slate-900">
                    {JSON.stringify(config.metadata.inputShape || [1, 160, 160, 3])}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Input Range:</span>
                  <span className="font-mono font-medium text-slate-900">[0, 255] float32 RGB</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Classes ({config.metadata.classes?.length || 4}):</span>
                  <span className="font-mono font-medium text-slate-900">
                    {config.metadata.classes?.join(', ') || 'agriculture, built_up, forest, water'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Training Split:</span>
                  <span className="font-mono font-medium text-slate-900">
                    {config.metadata.practiceMode ? 'Synthetic Practice' : 'Official Dataset'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Review Threshold:</span>
                  <span className="font-mono font-medium text-slate-900">0.70</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5-Point Competition Model Integration Status */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-[#102B46]">
            <Cpu className="w-4 h-4 text-[#1779B8] shrink-0" />
            <span>AI Sansad Round 2 — Model Integration Status</span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
            <div className="p-2.5 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-semibold text-slate-800">1. Training Pipeline</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Prepared &amp; Practice-Tested (Google Colab)
              </span>
            </div>

            <div className="p-2.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-semibold text-slate-800">2. Saved Model Archive</span>
              <span className="inline-flex items-center gap-1 font-medium text-slate-700 text-[11px] bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-200 font-mono">
                Hosted on GitHub Pages (.tflite)
              </span>
            </div>

            <div className="p-2.5 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-semibold text-slate-800">3. Official Dataset Training</span>
              <span className="inline-flex items-center gap-1 font-medium text-amber-700 text-[11px] bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200">
                <AlertTriangle className="w-3 h-3" /> Pending Competition Dataset Release
              </span>
            </div>

            <div className="p-2.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-semibold text-slate-800">4. Website Inference Adapter</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> @tensorflow/tfjs-tflite WebAssembly
              </span>
            </div>

            <div className="p-2.5 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-semibold text-slate-800">5. Practice Mode Notice</span>
              <span className="text-[11px] text-amber-800 font-medium">
                Predictions from synthetic practice model are not validated competition results
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#102B46] text-white hover:bg-[#1779B8] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
