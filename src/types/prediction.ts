export interface ClassScore {
  label: string;
  score: number; // 0.0 to 1.0 uncalibrated model score
}

export interface LandUseClass {
  id: string;
  name: string;
  description: string;
  colorHex: string;
}

export type ModelConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface BrowserModelMetadata {
  project?: string;
  model_format?: string;
  model_version?: string;
  practice_mode?: boolean;
  synthetic_data?: boolean;
  class_names: string[];
  image_size: number;
  input_shape: number[];
  input_dtype: string;
  input_color_format: string;
  input_pixel_range: [number, number];
  preprocessing: string;
  review_threshold: number;
  model_sha256?: string;
}

export interface ModelMetadata {
  modelName?: string;
  inputShape?: number[]; // e.g. [1, 160, 160, 3]
  classes?: string[];
  normalization?: 'zero_to_one' | 'imagenet' | 'custom' | string;
  framework?: string; // e.g. 'TensorFlow Lite (WASM)'
  practiceMode?: boolean;
  syntheticData?: boolean;
  modelSha256?: string;
  browserMetadata?: BrowserModelMetadata;
}

export interface ModelEndpointConfig {
  status: ModelConnectionStatus;
  endpointUrl: string;
  modelType: 'tflite_web' | 'keras_rest' | 'tfjs_bundle' | 'onnx_web';
  inputResolution: number; // e.g. 160
  lastTested?: string;
  errorMessage?: string;
  metadata?: ModelMetadata;
  modelUrl?: string;
  metadataUrl?: string;
}

export interface ImageUploadState {
  file: File | null;
  name: string;
  sizeBytes: number;
  width: number;
  height: number;
  dataUrl: string;
}

export interface PredictionResult {
  id: string;
  predictedClass: string;
  modelScore: number; // 0 to 1
  classScores: ClassScore[];
  reviewRecommended: boolean;
  scoreThresholdUsed: number;
  modelVersion?: string;
  inferenceMs?: number;
  isExample: boolean;
  isPracticeModel?: boolean;
  timestamp: string;
  imageMetadata: {
    name: string;
    width: number;
    height: number;
    sizeBytes: number;
    dataUrl: string;
  };
  reviewStatus?: 'pending' | 'flagged' | 'approved' | 'reclassified';
  reviewerNotes?: string;
  humanAssignedClass?: string;
  storagePath?: string;
  cloudSaveStatus?: 'idle' | 'saving' | 'saved' | 'failed' | 'error';
  cloudSaveError?: string;
  cloudError?: string;
}

export interface QueueItem extends PredictionResult {
  addedAt: string;
}

export interface EvaluationMetricPlaceholder {
  name: string;
  category: 'aggregate' | 'per_class';
  targetBenchmark?: string;
  status: 'awaiting_competition_dataset';
  description: string;
}

export interface ModelComparisonEntry {
  model: string;
  val_accuracy: number;
  val_macro_f1: number;
}

export interface EvaluationImportData {
  project?: string;
  practice_mode: boolean;
  model_name: string;
  classes: string[];
  dataset: {
    train_images: number;
    validation_images: number;
    test_images: number;
  };
  metrics: {
    accuracy: number;
    macro_f1: number;
  };
  confusion_matrix: number[][];
  model_comparison?: ModelComparisonEntry[];
  importedAt?: string;
}
