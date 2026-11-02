import { EvaluationImportData, LandUseClass, ModelEndpointConfig, PredictionResult, QueueItem } from './prediction';

export interface UserPreferences {
  reviewThreshold: number; // e.g. 0.70
  autoFlagLowConfidence: boolean;
  activeModelName?: string;
  themePreference?: 'light' | 'system';
}

export interface StoredImageRecord {
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  uploadedAt: string;
  uri: string;
}

export interface BackendStorageStatus {
  isPersistent: boolean;
  adapterName: string;
  statusMessage: string;
  lastSyncTimestamp?: string;
}

export interface StorageService {
  // System status
  getStatus(): BackendStorageStatus;

  // Evaluation results
  getEvaluationResults(): Promise<EvaluationImportData | null>;
  saveEvaluationResults(
    data: EvaluationImportData
  ): Promise<{ success: boolean; isDuplicate?: boolean; error?: string }>;
  clearEvaluationResults(): Promise<void>;

  // Review queue
  getReviewQueueItems(): Promise<{ real: QueueItem[]; example: QueueItem[] }>;
  saveReviewQueueItem(item: QueueItem): Promise<void>;
  updateReviewQueueStatus(
    id: string,
    isExample: boolean,
    status: 'pending' | 'flagged' | 'approved' | 'reclassified',
    humanClass?: string,
    notes?: string
  ): Promise<void>;
  removeReviewQueueItem(id: string, isExample: boolean): Promise<void>;
  clearReviewQueue(isExample: boolean): Promise<void>;

  // Classification history
  getClassificationHistory(): Promise<PredictionResult[]>;
  recordPrediction(
    result: PredictionResult,
    rawImageBlob?: Blob | File | null
  ): Promise<{ success: boolean; storagePath?: string; error?: string }>;
  clearClassificationHistory(): Promise<void>;

  // Model metadata & class taxonomy
  getClassTaxonomy(): Promise<LandUseClass[]>;
  saveClassTaxonomy(classes: LandUseClass[]): Promise<void>;
  getModelEndpointConfig(): Promise<ModelEndpointConfig>;
  saveModelEndpointConfig(config: ModelEndpointConfig): Promise<void>;

  // User preferences & review thresholds
  getUserPreferences(): Promise<UserPreferences>;
  saveUserPreferences(prefs: Partial<UserPreferences>): Promise<void>;

  // Image storage abstraction (for future cloud object store e.g. GCS / S3)
  // NOTE: Binary images are never stored as giant base64 strings in DB rows.
  uploadTileImage(file: File): Promise<StoredImageRecord>;

  // Data backup & migration
  exportAllUserData(): Promise<UserDataBackup>;
  importBackupData(backup: UserDataBackup): Promise<{ success: boolean; count: number; error?: string }>;
}

export interface ReviewEventRecord {
  id: string;
  predictionId: string;
  userId?: string;
  action: 'approved' | 'flagged' | 'reclassified';
  previousStatus: string;
  newStatus: string;
  assignedClass?: string;
  notes?: string;
  createdAt: string;
}

export interface UserDataBackup {
  version: string;
  exportedAt: string;
  userId?: string;
  settings: {
    classes: LandUseClass[];
    reviewThreshold: number;
    modelEndpointConfig: ModelEndpointConfig;
    userPreferences: UserPreferences;
  };
  predictions: PredictionResult[];
  reviewEvents: ReviewEventRecord[];
  evaluations: EvaluationImportData[];
}
