import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Cloud,
  CloudCheck,
  Eye,
  FileImage,
  HelpCircle,
  Info,
  Layers,
  RefreshCw,
  Send,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { SAMPLE_TILES, SampleTile } from '../data/sampleTiles';
import { PredictionService } from '../services/predictionService';
import { storageService } from '../services/storageService';
import { ImageUploadState, LandUseClass, ModelEndpointConfig, PredictionResult, QueueItem } from '../types/prediction';

interface ClassificationViewProps {
  predictionService: PredictionService;
  classes: LandUseClass[];
  reviewThreshold: number;
  endpointConfig: ModelEndpointConfig;
  currentImage: ImageUploadState | null;
  setCurrentImage: (img: ImageUploadState | null) => void;
  predictionResult: PredictionResult | null;
  setPredictionResult: (res: PredictionResult | null) => void;
  onOpenModelModal: () => void;
  onOpenClassModal: () => void;
  onAddToReviewQueue: (item: QueueItem) => void;
}

export const ClassificationView: React.FC<ClassificationViewProps> = ({
  predictionService,
  classes,
  reviewThreshold,
  endpointConfig,
  currentImage,
  setCurrentImage,
  predictionResult,
  setPredictionResult,
  onOpenModelModal,
  onOpenClassModal,
  onAddToReviewQueue,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [addedToQueueSuccess, setAddedToQueueSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClearImage = () => {
    setCurrentImage(null);
    setPredictionResult(null);
    setErrorMessage(null);
    setAddedToQueueSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = (file: File) => {
    setErrorMessage(null);
    setAddedToQueueSuccess(false);
    setPredictionResult(null);

    // Validate 0-byte or empty file
    if (!file || file.size === 0) {
      setErrorMessage('Selected file is empty (0 bytes). Please upload a valid image tile.');
      return;
    }

    // Validate format
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validMimes.includes(file.type) && !validExtensions.includes(fileExt)) {
      setErrorMessage(`Unsupported format: ${file.type || fileExt || 'unknown'}. Only JPG, JPEG, and PNG images are supported.`);
      return;
    }

    // Validate file size: 10MB limit
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage(`File exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please select a compressed satellite tile.`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setCurrentImage({
        file,
        name: file.name,
        sizeBytes: file.size,
        width: img.naturalWidth || 1024,
        height: img.naturalHeight || 1024,
        dataUrl: objectUrl,
      });
    };
    img.onerror = () => {
      setErrorMessage('Could not decode image tile. The file may be corrupt or not a valid image.');
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample: SampleTile) => {
    setErrorMessage(null);
    setPredictionResult(null);
    setAddedToQueueSuccess(false);

    const img = new Image();
    img.onload = () => {
      setCurrentImage({
        file: null,
        name: `${sample.id}.jpg (${sample.label})`,
        sizeBytes: 420000,
        width: img.naturalWidth || 1024,
        height: img.naturalHeight || 1024,
        dataUrl: sample.imageSrc,
      });
    };
    img.onerror = () => {
      setErrorMessage('Sample image failed to load.');
    };
    img.src = sample.imageSrc;
    if (img.complete && img.naturalWidth) {
      setCurrentImage({
        file: null,
        name: `${sample.id}.jpg (${sample.label})`,
        sizeBytes: 420000,
        width: img.naturalWidth,
        height: img.naturalHeight,
        dataUrl: sample.imageSrc,
      });
    }
  };

  // Action: Illustrative Example Generation (Explicitly marked fixture)
  const handleGenerateExample = (variant: 'high_confidence' | 'low_confidence_flagged') => {
    setAddedToQueueSuccess(false);
    setErrorMessage(null);

    // If no image is currently uploaded, auto-load default sample tile for immediate preview
    if (!currentImage) {
      const sample = SAMPLE_TILES[0];
      const img = new Image();
      setIsProcessing(true);

      const onImageLoaded = () => {
        const loadedImg: ImageUploadState = {
          file: null,
          name: `${sample.id}.jpg (${sample.label})`,
          sizeBytes: 420000,
          width: img.naturalWidth || 1024,
          height: img.naturalHeight || 1024,
          dataUrl: sample.imageSrc,
        };
        setCurrentImage(loadedImg);

        const example = predictionService.generateIllustrativeExample(
          {
            name: loadedImg.name,
            width: loadedImg.width,
            height: loadedImg.height,
            sizeBytes: loadedImg.sizeBytes,
            dataUrl: loadedImg.dataUrl,
          },
          variant,
          'Forest'
        );
        setPredictionResult(example);
        setIsProcessing(false);
      };

      img.onload = onImageLoaded;
      img.src = sample.imageSrc;
      if (img.complete && img.naturalWidth) {
        onImageLoaded();
      }
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const example = predictionService.generateIllustrativeExample(
        {
          name: currentImage.name,
          width: currentImage.width,
          height: currentImage.height,
          sizeBytes: currentImage.sizeBytes,
          dataUrl: currentImage.dataUrl,
        },
        variant,
        'Forest'
      );
      setPredictionResult(example);
      setIsProcessing(false);
    }, 200);
  };

  // Action: Live Classification (Strictly runs only when model is connected)
  const handleRealInference = async () => {
    if (endpointConfig.status !== 'connected') {
      return;
    }

    if (!currentImage) {
      setErrorMessage('Please upload or select an image tile first before running inference.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = await predictionService.classifyRealImage(currentImage.file as File, {
        name: currentImage.name,
        width: currentImage.width,
        height: currentImage.height,
        sizeBytes: currentImage.sizeBytes,
        dataUrl: currentImage.dataUrl,
      });

      result.cloudSaveStatus = 'saving';
      setPredictionResult({ ...result });

      // Save prediction record & image to Supabase Cloud
      const saveRes = await storageService.recordPrediction(result, currentImage.file);

      if (saveRes.success) {
        result.cloudSaveStatus = 'saved';
        result.storagePath = saveRes.storagePath;
      } else {
        result.cloudSaveStatus = 'failed';
        result.cloudSaveError = saveRes.error || 'Failed to persist to Supabase';
      }

      setPredictionResult({ ...result });
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Live inference request failed. The connected inference service could not be reached or timed out.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryCloudSave = async () => {
    if (!predictionResult || !currentImage) return;

    const updated: PredictionResult = { ...predictionResult, cloudSaveStatus: 'saving' };
    setPredictionResult(updated);

    const saveRes = await storageService.recordPrediction(updated, currentImage.file);

    if (saveRes.success) {
      updated.cloudSaveStatus = 'saved';
      updated.storagePath = saveRes.storagePath;
      updated.cloudSaveError = undefined;
    } else {
      updated.cloudSaveStatus = 'failed';
      updated.cloudSaveError = saveRes.error || 'Retry failed to persist to Supabase';
    }

    setPredictionResult({ ...updated });
  };

  const handleQueueSubmission = () => {
    if (!predictionResult) return;
    const queueItem: QueueItem = {
      ...predictionResult,
      addedAt: new Date().toISOString(),
    };
    onAddToReviewQueue(queueItem);
    setAddedToQueueSuccess(true);
  };

  // Helper color resolver
  const getClassColor = (label: string): string => {
    const matched = classes.find((c) => c.name.toLowerCase() === label.toLowerCase());
    return matched ? matched.colorHex : '#1779B8';
  };

  return (
    <div className="space-y-8 py-2">
      {/* Top Banner: Task & Honesty Context */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Input Tile Categorization</span>
            <span aria-hidden="true">·</span>
            <span>Uncalibrated Softmax Output</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#102B46]">
            Satellite Image Classification
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl">
            Upload single-tile true-color satellite imagery (JPG/PNG). While the Colab-trained model is in development, you can test the layout and threshold flagging using explicitly marked illustrative fixtures.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900 font-mono">
              Review Threshold: {(reviewThreshold * 100).toFixed(0)}%
            </div>
            <div className="text-[11px] text-slate-500">
              Flags top scores &lt; {reviewThreshold.toFixed(2)}
            </div>
          </div>
          <button
            onClick={onOpenClassModal}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            Adjust
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Ingestion & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Upload Zone */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                1. Select Satellite Tile
              </span>
              <span className="text-xs text-slate-500">Max size 10MB</span>
            </div>

            {/* Hidden Input outside to avoid click bubbling */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={handleFileInputChange}
              onClick={(e) => {
                e.stopPropagation();
                (e.target as HTMLInputElement).value = '';
              }}
              className="hidden"
            />

            {/* Drag & Drop Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-[#1779B8] bg-[#DCEFFB]/20'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#1779B8] shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Click to browse or drag & drop satellite tile
                  </p>
                  <p className="text-xs text-slate-500">
                    Supports high-resolution JPG, JPEG, and PNG (RGB true-color)
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Sample Tiles */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  Or load a sample Earth observation tile:
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {SAMPLE_TILES.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className="p-2 text-left rounded-lg border border-slate-200 hover:border-[#1779B8] bg-slate-50 hover:bg-[#DCEFFB]/20 transition-all flex items-center gap-2 group cursor-pointer"
                  >
                    <img
                      src={sample.imageSrc}
                      alt={sample.label}
                      className="w-10 h-10 object-cover rounded-md shrink-0 border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-semibold text-slate-900 truncate group-hover:text-[#1779B8]">
                        {sample.label}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {sample.suggestedIllustrativeClass}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Preview & Metadata */}
            {currentImage && (
              <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    Active Image Tile
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-[#1779B8] hover:text-[#102B46] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Replace
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={handleClearImage}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="relative w-full sm:w-44 h-44 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-900/5">
                    <img
                      src={currentImage.dataUrl}
                      alt={currentImage.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => {
                        setErrorMessage('Failed to display image preview. The image resource could not be rendered or decoded.');
                      }}
                    />
                  </div>

                  <div className="w-full space-y-2 text-xs">
                    <div className="space-y-1">
                      <div className="text-slate-500 font-medium">Filename</div>
                      <div className="font-mono text-slate-900 font-semibold break-all">
                        {currentImage.name}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <div>
                        <div className="text-slate-500 font-medium">Resolution</div>
                        <div className="font-mono text-slate-900 font-semibold">
                          {currentImage.width} × {currentImage.height} px
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium">File Size</div>
                        <div className="font-mono text-slate-900 font-semibold">
                          {(currentImage.sizeBytes / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      Browser-side memory cache · Clean URL revocation enabled
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Model Status & Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                2. Classification Execution
              </span>
              <h3 className="text-sm font-bold text-[#102B46]">
                Model Status & Action Gate
              </h3>
            </div>

            {/* Model Status Banner */}
            {endpointConfig.status === 'connected' ? (
              <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      {endpointConfig.metadata?.practiceMode
                        ? 'STATUS: PRACTICE MODEL CONNECTED'
                        : 'STATUS: MODEL CONNECTED & VERIFIED'}
                    </span>
                  </div>
                  <button
                    onClick={onOpenModelModal}
                    className="text-xs font-semibold text-[#1779B8] hover:text-[#102B46] underline decoration-slate-300 cursor-pointer"
                  >
                    Configure Connection
                  </button>
                </div>
                <p className="text-xs text-emerald-900/80 leading-relaxed">
                  {endpointConfig.metadata?.practiceMode ? (
                    <>
                      Connected to TensorFlow Lite model (<span className="font-mono font-semibold">{endpointConfig.metadata.modelName || 'baseline_cnn'}</span>) via in-browser WebAssembly. <span className="font-medium text-amber-900">NOTE: This model was trained on synthetic practice data; predictions demonstrate real pipeline functionality but are not validated competition results.</span>
                    </>
                  ) : (
                    <>
                      Connected to verified model endpoint: <span className="font-mono font-semibold">{endpointConfig.endpointUrl}</span>. Live satellite tile classification is enabled.
                    </>
                  )}
                </p>
              </div>
            ) : endpointConfig.status === 'connecting' ? (
              <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-[#1779B8] animate-spin" />
                    <span className="text-xs font-bold text-[#102B46] uppercase tracking-wide">
                      STATUS: INITIALIZING TENSORFLOW LITE (WASM)...
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fetching model binary and verifying in-browser WebAssembly execution pipeline...
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                      STATUS: MODEL NOT CONNECTED
                    </span>
                  </div>
                  <button
                    onClick={onOpenModelModal}
                    className="text-xs font-semibold text-[#1779B8] hover:text-[#102B46] underline decoration-slate-300 cursor-pointer"
                  >
                    Model Connection Guide
                  </button>
                </div>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  Model integration pending. The training pipeline and prediction demo have been verified in Google Colab. Live website classification will become available after connecting the trained model.
                </p>
              </div>
            )}

            {/* Error Message if any */}
            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Real Classify Button */}
                {endpointConfig.status === 'connected' ? (
                  <button
                    type="button"
                    disabled={isProcessing || !currentImage}
                    onClick={handleRealInference}
                    className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 bg-[#1779B8] hover:bg-[#136295] text-white shadow-xs cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                    title={!currentImage ? 'Select or upload an image tile first' : 'Run genuine in-browser model classification'}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Running TFLite Inference...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Classify Image ({endpointConfig.metadata?.practiceMode ? 'Practice Model' : 'Live Model'})
                      </>
                    )}
                  </button>
                ) : endpointConfig.status === 'connecting' ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center gap-2 cursor-not-allowed select-none"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    Connecting to Model...
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center gap-2 cursor-not-allowed select-none"
                    aria-disabled="true"
                    title="Live classification is disabled until a verified model is connected."
                  >
                    <Send className="w-3.5 h-3.5 text-slate-400" />
                    Connect Model to Enable Classification
                  </button>
                )}

                {/* View Illustrative Example Button */}
                <button
                  disabled={isProcessing}
                  onClick={() => handleGenerateExample('high_confidence')}
                  className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 bg-[#102B46] hover:bg-[#0B1E32] text-white shadow-xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Illustrative Example (Score 0.82)
                </button>
              </div>

              {/* Informative notice when disconnected */}
              {endpointConfig.status !== 'connected' && (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Live classification is disabled until a trained model endpoint is connected and verified. You can test output formatting and review thresholds using the illustrative examples below.
                </p>
              )}

              {/* Secondary button to test threshold flagging */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Want to test the Human Review flag trigger?</span>
                <button
                  onClick={() => handleGenerateExample('low_confidence_flagged')}
                  className="font-medium text-[#1779B8] hover:text-[#102B46] transition-colors underline cursor-pointer"
                >
                  Test Uncertain Example (Score 0.58 &lt; 0.70)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Prediction Results (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                3. Prediction Output
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {predictionResult ? (predictionResult.isExample ? 'FIXTURE PREVIEW' : 'REAL OUTPUT') : 'WAITING'}
              </span>
            </div>

            {!predictionResult ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <FileImage className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-800">
                    No Prediction Generated
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Select an image tile and click "View Illustrative Example" to preview the output interface and class score bars.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Mandatory Conspicuous Practice Model Banner (Requirement 17) */}
                {predictionResult.isPracticeModel && (
                  <div className="p-3.5 rounded-lg bg-amber-500/10 border-2 border-amber-500/50 text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold font-mono tracking-wide">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      PRACTICE MODEL PREDICTION — SYNTHETIC DATA
                    </div>
                    <p className="text-[11px] text-amber-900/90 leading-normal">
                      The uploaded tile was evaluated live by the in-browser <strong>TensorFlow Lite</strong> model. Because this model was trained on <strong>synthetic practice imagery</strong>, these predictions verify pipeline execution and are <strong>not validated competition results</strong>.
                    </p>
                  </div>
                )}

                {/* Mandatory Conspicuous Example Banner */}
                {predictionResult.isExample && (
                  <div className="p-3.5 rounded-lg bg-amber-500/10 border-2 border-amber-500/50 text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold font-mono tracking-wide">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ILLUSTRATIVE EXAMPLE — NOT A REAL MODEL PREDICTION
                    </div>
                    <p className="text-[11px] text-amber-900/90 leading-normal">
                      The uploaded tile was <strong>not evaluated</strong> by a real model. These values are illustrative UI fixtures to demonstrate output formatting and human-review thresholding. They are not derived from the uploaded image tile.
                    </p>
                  </div>
                )}

                {/* Primary Predicted Class & Score */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Predicted Land-Use Class</span>
                    <span className="font-mono text-[11px]">Uncalibrated Score</span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-xs shrink-0"
                        style={{ backgroundColor: getClassColor(predictionResult.predictedClass) }}
                      />
                      <span className="text-2xl font-bold text-slate-900">
                        {predictionResult.predictedClass}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                        {predictionResult.modelScore.toFixed(2)}
                      </span>
                      <span className="text-xs font-mono text-slate-400 ml-1">/ 1.00</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-tight pt-1">
                    Raw softmax probability output. Uncalibrated against real-world domain priors.
                  </p>
                </div>

                {/* Ranked Class Distribution Horizontal Bar Chart */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Ranked Class Scores
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {predictionResult.classScores.length} Classes Evaluated
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {predictionResult.classScores.map((item) => {
                      const percentage = Math.round(item.score * 100);
                      const barColor = getClassColor(item.label);
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-800">
                              {item.label}
                            </span>
                            <span className="font-mono text-slate-600 font-semibold tabular-nums">
                              {item.score.toFixed(2)} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.max(percentage, 2)}%`,
                                backgroundColor: barColor,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Human Review Recommendation Card */}
                <div
                  className={`p-4 rounded-xl border space-y-2 ${
                    predictionResult.reviewRecommended
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {predictionResult.reviewRecommended ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {predictionResult.reviewRecommended
                        ? 'Human Review Recommended'
                        : 'Meets Confidence Threshold'}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed">
                    {predictionResult.reviewRecommended
                      ? `The top class score (${predictionResult.modelScore.toFixed(2)}) is below the required ${predictionResult.scoreThresholdUsed.toFixed(2)} threshold. A certified spatial planner must inspect boundary and vegetation features.`
                      : `The top class score (${predictionResult.modelScore.toFixed(2)}) is above the ${predictionResult.scoreThresholdUsed.toFixed(2)} threshold. Standard pass accepted.`}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/40">
                    <button
                      onClick={handleQueueSubmission}
                      disabled={addedToQueueSuccess}
                      className="text-xs font-semibold text-[#102B46] hover:text-[#1779B8] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {addedToQueueSuccess ? 'Added to Review Queue ✓' : 'Send to Review Queue →'}
                    </button>
                    <span className="text-[11px] text-slate-500">
                      In-memory session queue
                    </span>
                  </div>
                </div>

                {/* Supabase Cloud Save Status Card */}
                {predictionResult.cloudSaveStatus && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      predictionResult.cloudSaveStatus === 'saved'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : predictionResult.cloudSaveStatus === 'saving'
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {predictionResult.cloudSaveStatus === 'saving' ? (
                        <RefreshCw className="w-3.5 h-3.5 text-[#1779B8] animate-spin" />
                      ) : predictionResult.cloudSaveStatus === 'saved' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span className="font-semibold">
                        {predictionResult.cloudSaveStatus === 'saving'
                          ? 'Saving to Supabase Cloud...'
                          : predictionResult.cloudSaveStatus === 'saved'
                          ? 'Saved to Supabase Cloud ✓'
                          : `Cloud Save Failed: ${predictionResult.cloudSaveError || 'Error'}`}
                      </span>
                    </div>

                    {predictionResult.cloudSaveStatus === 'failed' && (
                      <button
                        onClick={handleRetryCloudSave}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-md transition-colors cursor-pointer"
                      >
                        Retry Save
                      </button>
                    )}
                  </div>
                )}

                {/* Meta details footer */}
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Model Version:</span>
                    <span className="font-mono text-slate-700">
                      {predictionResult.modelVersion || 'Not Connected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inference Latency:</span>
                    <span className="font-mono text-slate-700">
                      {predictionResult.inferenceMs !== undefined
                        ? `${predictionResult.inferenceMs} ms`
                        : 'Not Measured (Example)'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
