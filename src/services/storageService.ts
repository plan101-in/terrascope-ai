import { INITIAL_LAND_USE_CLASSES } from '../data/defaultClasses';
import {
  EvaluationImportData,
  LandUseClass,
  ModelEndpointConfig,
  PredictionResult,
  QueueItem,
} from '../types/prediction';
import {
  BackendStorageStatus,
  StorageService,
  StoredImageRecord,
  UserPreferences,
} from '../types/storage';

/**
 * InMemoryStorageService
 * 
 * Provides an in-memory session implementation of the StorageService contract.
 * Designed to cleanly isolate data persistence from React UI components so that
 * when an external database or backend service (e.g. Cloud SQL, Firestore, REST API)
 * is connected in the future, only this service adapter needs to be swapped.
 * 
 * Architectural Rules:
 * 1. Satellite tile images are handled through uploadTileImage() returning a storageKey/URI,
 *    preventing binary blobs or base64 from being stuffed into relational rows or documents.
 * 2. Model class taxonomy and ordering are preserved as provided.
 * 3. Does not invent false persistence claims: getStatus() honestly reports in-memory session storage.
 */
export class InMemoryStorageService implements StorageService {
  private evaluationData: EvaluationImportData | null = null;
  private realQueueItems: QueueItem[] = [];
  private exampleQueueItems: QueueItem[] = [];
  private classificationHistory: PredictionResult[] = [];
  private classes: LandUseClass[] = [...INITIAL_LAND_USE_CLASSES];
  private endpointConfig: ModelEndpointConfig = {
    status: 'disconnected',
    endpointUrl: '',
    modelType: 'keras_rest',
    inputResolution: 224,
  };
  private userPreferences: UserPreferences = {
    reviewThreshold: 0.70,
    autoFlagLowConfidence: true,
    themePreference: 'light',
  };

  getStatus(): BackendStorageStatus {
    return {
      isPersistent: false,
      adapterName: 'InMemorySessionAdapter',
      statusMessage:
        'Running on in-memory application session storage. No external database connected.',
      lastSyncTimestamp: new Date().toISOString(),
    };
  }

  // --- Evaluation Results ---
  async getEvaluationResults(): Promise<EvaluationImportData | null> {
    return this.evaluationData ? JSON.parse(JSON.stringify(this.evaluationData)) : null;
  }

  async saveEvaluationResults(data: EvaluationImportData): Promise<{ success: boolean; isDuplicate?: boolean; error?: string }> {
    this.evaluationData = JSON.parse(JSON.stringify(data));
    return { success: true };
  }

  async clearEvaluationResults(): Promise<void> {
    this.evaluationData = null;
  }

  // --- Review Queue ---
  async getReviewQueueItems(): Promise<{ real: QueueItem[]; example: QueueItem[] }> {
    return {
      real: [...this.realQueueItems],
      example: [...this.exampleQueueItems],
    };
  }

  async saveReviewQueueItem(item: QueueItem): Promise<void> {
    if (item.isExample) {
      this.exampleQueueItems.unshift(item);
    } else {
      this.realQueueItems.unshift(item);
    }
  }

  async updateReviewQueueStatus(
    id: string,
    isExample: boolean,
    status: 'pending' | 'flagged' | 'approved' | 'reclassified',
    humanClass?: string,
    notes?: string
  ): Promise<void> {
    const targetQueue = isExample ? this.exampleQueueItems : this.realQueueItems;
    const index = targetQueue.findIndex((item) => item.id === id);
    if (index !== -1) {
      targetQueue[index] = {
        ...targetQueue[index],
        reviewStatus: status,
        humanAssignedClass: humanClass || targetQueue[index].humanAssignedClass,
        reviewerNotes: notes !== undefined ? notes : targetQueue[index].reviewerNotes,
      };
    }
  }

  async removeReviewQueueItem(id: string, isExample: boolean): Promise<void> {
    if (isExample) {
      this.exampleQueueItems = this.exampleQueueItems.filter((item) => item.id !== id);
    } else {
      this.realQueueItems = this.realQueueItems.filter((item) => item.id !== id);
    }
  }

  async clearReviewQueue(isExample: boolean): Promise<void> {
    if (isExample) {
      this.exampleQueueItems = [];
    } else {
      this.realQueueItems = [];
    }
  }

  // --- Classification History ---
  async getClassificationHistory(): Promise<PredictionResult[]> {
    return [...this.classificationHistory];
  }

  async recordPrediction(
    result: PredictionResult,
    _rawImageBlob?: Blob | File | null
  ): Promise<{ success: boolean; storagePath?: string; error?: string }> {
    this.classificationHistory.unshift(result);
    return { success: true };
  }

  async clearClassificationHistory(): Promise<void> {
    this.classificationHistory = [];
  }

  // --- Taxonomy & Configuration ---
  async getClassTaxonomy(): Promise<LandUseClass[]> {
    return [...this.classes];
  }

  async saveClassTaxonomy(classes: LandUseClass[]): Promise<void> {
    this.classes = [...classes];
  }

  async getModelEndpointConfig(): Promise<ModelEndpointConfig> {
    return { ...this.endpointConfig };
  }

  async saveModelEndpointConfig(config: ModelEndpointConfig): Promise<void> {
    this.endpointConfig = { ...config };
  }

  // --- User Preferences ---
  async getUserPreferences(): Promise<UserPreferences> {
    return { ...this.userPreferences };
  }

  async saveUserPreferences(prefs: Partial<UserPreferences>): Promise<void> {
    this.userPreferences = {
      ...this.userPreferences,
      ...prefs,
    };
  }

  // --- Data Backup & Migration ---
  async exportAllUserData() {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: {
        classes: this.classes,
        reviewThreshold: this.userPreferences.reviewThreshold,
        modelEndpointConfig: this.endpointConfig,
        userPreferences: this.userPreferences,
      },
      predictions: this.classificationHistory,
      reviewEvents: [],
      evaluations: this.evaluationData ? [this.evaluationData] : [],
    };
  }

  async importBackupData(backup: any): Promise<{ success: boolean; count: number; error?: string }> {
    if (backup?.settings?.classes) {
      this.classes = backup.settings.classes;
    }
    if (backup?.evaluations?.[0]) {
      this.evaluationData = backup.evaluations[0];
    }
    return { success: true, count: backup?.predictions?.length || 0 };
  }

  // --- Tile Image Storage Abstraction ---
  async uploadTileImage(file: File): Promise<StoredImageRecord> {
    const key = `tiles/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uri = URL.createObjectURL(file);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          storageKey: key,
          filename: file.name,
          mimeType: file.type || 'image/jpeg',
          sizeBytes: file.size,
          width: img.naturalWidth || 1024,
          height: img.naturalHeight || 1024,
          uploadedAt: new Date().toISOString(),
          uri,
        });
      };
      img.onerror = () => {
        resolve({
          storageKey: key,
          filename: file.name,
          mimeType: file.type || 'image/jpeg',
          sizeBytes: file.size,
          width: 1024,
          height: 1024,
          uploadedAt: new Date().toISOString(),
          uri,
        });
      };
      img.src = uri;
    });
  }
}

export { SupabaseStorageService, storageService } from './supabaseStorageService';
