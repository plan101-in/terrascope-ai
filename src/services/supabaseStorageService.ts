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
  ReviewEventRecord,
  StorageService,
  StoredImageRecord,
  UserDataBackup,
  UserPreferences,
} from '../types/storage';
import {
  clearSignedImageCache,
  computeContentHash,
  getSignedImageUrl,
  supabase,
  uploadImageToPrivateBucket,
} from './supabaseClient';
import { DEFAULT_METADATA_URL, DEFAULT_TFLITE_URL } from './tfliteService';

/**
 * SupabaseStorageService
 * 
 * Production cloud storage adapter connecting TerraScope AI to Supabase:
 * - PostgreSQL tables: terrascope_settings, terrascope_predictions, terrascope_review_events, terrascope_evaluations
 * - Private storage bucket: terrascope-images (authenticated access with signed URLs)
 * - Row Level Security (RLS) compliant
 * - Fallback in-memory storage for unauthenticated / guest usage
 */
export class SupabaseStorageService implements StorageService {
  private currentUserId: string | null = null;
  private currentUserEmail: string | null = null;

  // Local mirror/cache for low-latency UI responsiveness
  private localEvaluationData: EvaluationImportData | null = null;
  private localRealQueue: QueueItem[] = [];
  private localExampleQueue: QueueItem[] = [];
  private localClasses: LandUseClass[] = [...INITIAL_LAND_USE_CLASSES];
  private localEndpointConfig: ModelEndpointConfig = {
    status: 'disconnected',
    endpointUrl: DEFAULT_TFLITE_URL,
    modelUrl: DEFAULT_TFLITE_URL,
    metadataUrl: DEFAULT_METADATA_URL,
    modelType: 'tflite_web',
    inputResolution: 160,
  };
  private localPreferences: UserPreferences = {
    reviewThreshold: 0.70,
    autoFlagLowConfidence: true,
    themePreference: 'light',
  };

  private lastSyncTimestamp: string = new Date().toISOString();

  // App.tsx owns the one Supabase auth subscription and calls setUser().

  public setUser(userId: string | null, email?: string | null) {
    if (this.currentUserId !== userId) {
      clearSignedImageCache();
      this.localRealQueue = [];
      this.localExampleQueue = [];
      this.localEvaluationData = null;
      this.localClasses = [...INITIAL_LAND_USE_CLASSES];
      this.localPreferences = { reviewThreshold: 0.70, autoFlagLowConfidence: true, themePreference: 'light' };
    }
    this.currentUserId = userId;
    this.currentUserEmail = email || null;
    this.lastSyncTimestamp = new Date().toISOString();
  }

  public getUserId(): string | null {
    return this.currentUserId;
  }

  public getUserEmail(): string | null {
    return this.currentUserEmail;
  }

  getStatus(): BackendStorageStatus {
    const isPersistent = Boolean(this.currentUserId);
    return {
      isPersistent,
      adapterName: isPersistent ? 'SupabaseCloudAdapter' : 'InMemorySessionAdapter',
      statusMessage: isPersistent
        ? `Signed in as ${this.currentUserEmail || this.currentUserId}. Each cloud write must still be verified.`
        : 'Not signed in. Predictions are not persistently saved until cloud authentication succeeds.',
      lastSyncTimestamp: this.lastSyncTimestamp,
    };
  }

  // ==========================================
  // SETTINGS & USER PREFERENCES
  // ==========================================

  async loadUserSettings(): Promise<{
    classes?: LandUseClass[];
    reviewThreshold?: number;
    endpointConfig?: ModelEndpointConfig;
    preferences?: UserPreferences;
  } | null> {
    if (!this.currentUserId) return null;

    try {
      const { data, error } = await supabase
        .from('terrascope_settings')
        .select('*')
        .eq('user_id', this.currentUserId)
        .maybeSingle();

      if (error) {
        throw new Error(`Settings load failed: ${error.message}`);
      }

      if (data) {
        const threshold = data.review_threshold ?? 0.70;
        this.localPreferences.reviewThreshold = threshold;

        const config = data.model_config;
        if (Array.isArray(data.class_config) && data.class_config.length > 0) {
          this.localClasses = data.class_config;
        }
        if (config) {
          if (Array.isArray(config.classes) && config.classes.length > 0) {
            this.localClasses = config.classes;
          }
          if (config.endpointConfig) {
            this.localEndpointConfig = {
              ...this.localEndpointConfig,
              ...config.endpointConfig,
            };
          }
          if (config.userPreferences) {
            this.localPreferences = {
              ...this.localPreferences,
              ...config.userPreferences,
            };
          }
        }

        this.lastSyncTimestamp = new Date().toISOString();
        return {
          classes: this.localClasses,
          reviewThreshold: threshold,
          endpointConfig: this.localEndpointConfig,
          preferences: this.localPreferences,
        };
      }
    } catch (err) {
      throw err;
    }
    return null;
  }

  private async persistSettings(): Promise<void> {
    if (!this.currentUserId) return; // Guest changes are temporary; sign in to persist.
    const userId = this.currentUserId;
    const payload = {
      user_id: userId,
      review_threshold: this.localPreferences.reviewThreshold,
      class_config: this.localClasses,
      model_config: {
        classes: this.localClasses,
        endpointConfig: this.localEndpointConfig,
        userPreferences: this.localPreferences,
      },
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('terrascope_settings')
      .upsert(payload, { onConflict: 'user_id' });
    if (error) throw new Error(`Settings could not be saved: ${error.message}`);
    this.lastSyncTimestamp = new Date().toISOString();
  }

  async getClassTaxonomy(): Promise<LandUseClass[]> {
    return [...this.localClasses];
  }

  async saveClassTaxonomy(classes: LandUseClass[]): Promise<void> {
    this.localClasses = [...classes];
    await this.persistSettings();
  }

  async getModelEndpointConfig(): Promise<ModelEndpointConfig> {
    return { ...this.localEndpointConfig };
  }

  async saveModelEndpointConfig(config: ModelEndpointConfig): Promise<void> {
    this.localEndpointConfig = { ...config };
    await this.persistSettings();
  }

  async getUserPreferences(): Promise<UserPreferences> {
    return { ...this.localPreferences };
  }

  async saveUserPreferences(prefs: Partial<UserPreferences>): Promise<void> {
    this.localPreferences = {
      ...this.localPreferences,
      ...prefs,
    };
    await this.persistSettings();
  }

  // ==========================================
  // PREDICTIONS & IMAGERY STORAGE
  // ==========================================

  /**
   * Persists a prediction result to Supabase terrascope_predictions
   * and uploads the original image tile to the private terrascope-images bucket.
   */
  async recordPrediction(
    result: PredictionResult,
    rawImageBlob?: Blob | File | null
  ): Promise<{ success: boolean; storagePath?: string; error?: string }> {
    if (!this.currentUserId) {
      return { success: false, error: 'Sign in before saving a classification to the cloud.' };
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.id)) {
      return { success: false, error: 'Prediction ID is not a UUID. Run a fresh prediction and retry.' };
    }

    const userId = this.currentUserId;
    const predictionId = result.id;
    let storagePath = result.storagePath || '';

    // 1. Upload original image if provided and not yet uploaded
    if (rawImageBlob && !storagePath) {
      const uploadRes = await uploadImageToPrivateBucket(
        userId,
        rawImageBlob,
        predictionId,
        result.imageMetadata.name
      );

      if (uploadRes.error) {
        return {
          success: false,
          error: `Storage upload failed: ${uploadRes.error}`,
        };
      }
      storagePath = uploadRes.storagePath;
    } else if (!storagePath && result.imageMetadata.dataUrl) {
      // Handle browser blob URLs and same-origin sample images, not only base64 data URLs.
      try {
        const res = await fetch(result.imageMetadata.dataUrl);
        const blob = await res.blob();
        const uploadRes = await uploadImageToPrivateBucket(
          userId,
          blob,
          predictionId,
          result.imageMetadata.name
        );
        if (uploadRes.error) return { success: false, error: uploadRes.error };
        storagePath = uploadRes.storagePath;
      } catch (e) {
        return { success: false, error: 'Could not read the image for private cloud upload.' };
      }
    }

    if (!storagePath) {
      return { success: false, error: 'The original image could not be stored. Prediction was not marked saved.' };
    }

    // 2. Insert or upsert record in terrascope_predictions
    try {
      const dbRecord = {
        id: predictionId,
        user_id: userId,
        image_path: storagePath || null,
        image_name: result.imageMetadata.name,
        image_size_bytes: result.imageMetadata.sizeBytes,
        image_width: result.imageMetadata.width,
        image_height: result.imageMetadata.height,
        predicted_class: result.predictedClass,
        class_scores: result.classScores,
        model_score: result.modelScore,
        model_version: result.modelVersion || 'baseline_cnn',
        inference_ms: result.inferenceMs || 0,
        review_threshold: result.scoreThresholdUsed,
        practice_mode: Boolean(result.isPracticeModel),
        is_example: Boolean(result.isExample),
        review_status: result.reviewStatus || 'pending',
        reviewer_notes: result.reviewerNotes || null,
        human_assigned_class: result.humanAssignedClass || null,
        created_at: result.timestamp || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('terrascope_predictions')
        .upsert(dbRecord, { onConflict: 'id' });

      if (error) {
        console.error('Supabase prediction insert error:', error);
        return { success: false, error: error.message };
      }

      this.lastSyncTimestamp = new Date().toISOString();
      return { success: true, storagePath };
    } catch (err: any) {
      console.error('Exception recording prediction to Supabase:', err);
      return { success: false, error: err.message || 'Database write error' };
    }
  }

  async getClassificationHistory(): Promise<PredictionResult[]> {
    if (!this.currentUserId) {
      return [...this.localRealQueue];
    }

    try {
      const { data, error } = await supabase
        .from('terrascope_predictions')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Classification history unavailable: ${error.message}`);
      }

      const results: PredictionResult[] = [];
      for (const row of data || []) {
        // Resolve private signed URL if image_path exists
        let previewUrl = '';
        if (row.image_path) {
          const signed = await getSignedImageUrl(row.image_path);
          if (signed) previewUrl = signed;
        }

        results.push({
          id: row.id,
          predictedClass: row.predicted_class,
          modelScore: Number(row.model_score),
          classScores: Array.isArray(row.class_scores) ? row.class_scores : [],
          reviewRecommended: Number(row.model_score) < Number(row.review_threshold),
          scoreThresholdUsed: Number(row.review_threshold) || 0.70,
          modelVersion: row.model_version,
          inferenceMs: Number(row.inference_ms),
          isExample: Boolean(row.is_example),
          isPracticeModel: Boolean(row.practice_mode),
          timestamp: row.created_at,
          imageMetadata: {
            name: row.image_name || 'Satellite Tile',
            width: row.image_width || 160,
            height: row.image_height || 160,
            sizeBytes: Number(row.image_size_bytes) || 0,
            dataUrl: previewUrl || '',
          },
          reviewStatus: row.review_status || 'pending',
          reviewerNotes: row.reviewer_notes || undefined,
          humanAssignedClass: row.human_assigned_class || undefined,
          storagePath: row.image_path || undefined,
          cloudSaveStatus: 'saved',
        });
      }

      return results;
    } catch (e) {
      throw e;
    }
  }

  async clearClassificationHistory(): Promise<void> {
    this.localRealQueue = [];
    if (this.currentUserId) {
      await supabase
        .from('terrascope_predictions')
        .delete()
        .eq('user_id', this.currentUserId);
    }
  }

  // ==========================================
  // REVIEW QUEUE & AUDIT EVENTS
  // ==========================================

  async getReviewQueueItems(): Promise<{ real: QueueItem[]; example: QueueItem[] }> {
    if (!this.currentUserId) {
      return {
        real: [...this.localRealQueue],
        example: [...this.localExampleQueue],
      };
    }

    try {
      const { data, error } = await supabase
        .from('terrascope_predictions')
        .select('*')
        .eq('user_id', this.currentUserId)
        .eq('in_review_queue', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Review queue load failed: ${error.message}`);
      }

      const realItems: QueueItem[] = [];
      // Illustrative fixtures intentionally remain session-only and separate from real records.
      const exampleItems: QueueItem[] = [...this.localExampleQueue];

      for (const row of data || []) {
        let displayUrl = '';
        if (row.image_path) {
          const signed = await getSignedImageUrl(row.image_path);
          if (signed) displayUrl = signed;
        }

        const item: QueueItem = {
          id: row.id,
          predictedClass: row.predicted_class,
          modelScore: Number(row.model_score),
          classScores: Array.isArray(row.class_scores) ? row.class_scores : [],
          reviewRecommended: Number(row.model_score) < Number(row.review_threshold),
          scoreThresholdUsed: Number(row.review_threshold) || 0.70,
          modelVersion: row.model_version,
          inferenceMs: Number(row.inference_ms),
          isExample: Boolean(row.is_example),
          isPracticeModel: Boolean(row.practice_mode),
          timestamp: row.created_at,
          addedAt: row.created_at,
          imageMetadata: {
            name: row.image_name || 'Tile',
            width: row.image_width || 160,
            height: row.image_height || 160,
            sizeBytes: Number(row.image_size_bytes) || 0,
            dataUrl: displayUrl || '',
          },
          reviewStatus: row.review_status || 'pending',
          reviewerNotes: row.reviewer_notes || undefined,
          humanAssignedClass: row.human_assigned_class || undefined,
          storagePath: row.image_path || undefined,
          cloudSaveStatus: 'saved',
        };

        if (row.is_example) {
          if (!exampleItems.some(existing => existing.id === item.id)) exampleItems.push(item);
        } else {
          realItems.push(item);
        }
      }

      this.localRealQueue = realItems;
      this.localExampleQueue = exampleItems;

      return { real: realItems, example: exampleItems };
    } catch (e) {
      throw e;
    }
  }

  async saveReviewQueueItem(item: QueueItem): Promise<void> {
    if (item.isExample) {
      const idx = this.localExampleQueue.findIndex((i) => i.id === item.id);
      if (idx !== -1) this.localExampleQueue[idx] = item;
      else this.localExampleQueue.unshift(item);
    } else {
      if (!this.currentUserId) throw new Error('Sign in to save a review submission.');
      const { data, error } = await supabase
        .from('terrascope_predictions')
        .update({ in_review_queue: true, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('user_id', this.currentUserId)
        .select('id')
        .maybeSingle();
      if (error || !data) throw new Error(error?.message || 'Save the prediction before adding it to review.');
      const idx = this.localRealQueue.findIndex(i => i.id === item.id);
      if (idx >= 0) this.localRealQueue[idx] = item;
      else this.localRealQueue.unshift(item);
    }
  }

  async updateReviewQueueStatus(
    id: string,
    isExample: boolean,
    status: 'pending' | 'flagged' | 'approved' | 'reclassified',
    humanClass?: string,
    notes?: string
  ): Promise<void> {
    // 1. Do not show success before the cloud write succeeds.
    const targetQueue = isExample ? this.localExampleQueue : this.localRealQueue;
    const existing = targetQueue.find((i) => i.id === id);
    const prevStatus = existing?.reviewStatus || 'pending';

    if (!isExample && !this.currentUserId) throw new Error('Sign in to persist review decisions.');
    if (!isExample && this.currentUserId) {
      try {
        const updatePayload: any = {
          review_status: status,
          updated_at: new Date().toISOString(),
        };
        if (humanClass !== undefined) updatePayload.human_assigned_class = humanClass;
        if (notes !== undefined) updatePayload.reviewer_notes = notes;

        const { error: updateErr } = await supabase
          .from('terrascope_predictions')
          .update(updatePayload)
          .eq('id', id)
          .eq('user_id', this.currentUserId);

        if (updateErr) {
          throw new Error(updateErr.message);
        }

        // Insert review event audit log
        const eventId = crypto.randomUUID();
        const { error: eventErr } = await supabase
          .from('terrascope_review_events')
          .insert({
            id: eventId,
            prediction_id: id,
            user_id: this.currentUserId,
            action: status,
            previous_status: prevStatus,
            new_status: status,
            assigned_class: humanClass || null,
            notes: notes || null,
            created_at: new Date().toISOString(),
          });

        if (eventErr) {
          // Status was persisted, but the separate audit write failed.
          throw new Error(`Review status saved, but audit log failed: ${eventErr.message}`);
        } else {
          this.lastSyncTimestamp = new Date().toISOString();
        }
      } catch (err) {
        console.error('Exception updating review queue in Supabase:', err);
        throw err;
      }
    }
    if (existing) {
      existing.reviewStatus = status;
      if (humanClass !== undefined) existing.humanAssignedClass = humanClass;
      if (notes !== undefined) existing.reviewerNotes = notes;
    }
  }

  async removeReviewQueueItem(id: string, isExample: boolean): Promise<void> {
    if (isExample) {
      this.localExampleQueue = this.localExampleQueue.filter((i) => i.id !== id);
    } else {
      if (!this.currentUserId) throw new Error('Sign in to remove a cloud queue item.');
      const { error } = await supabase
          .from('terrascope_predictions')
          .update({ in_review_queue: false })
          .eq('id', id)
          .eq('user_id', this.currentUserId);
      if (error) throw new Error(error.message);
      this.localRealQueue = this.localRealQueue.filter((i) => i.id !== id);
    }
  }

  async clearReviewQueue(isExample: boolean): Promise<void> {
    if (isExample) {
      this.localExampleQueue = [];
    } else {
      if (!this.currentUserId) throw new Error('Sign in to clear the cloud review queue.');
      const { error } = await supabase
          .from('terrascope_predictions')
          .update({ in_review_queue: false })
          .eq('user_id', this.currentUserId)
          .eq('in_review_queue', true);
      if (error) throw new Error(error.message);
      this.localRealQueue = [];
    }
  }

  // ==========================================
  // EVALUATION PERSISTENCE & DEDUPLICATION
  // ==========================================

  async getEvaluationResults(): Promise<EvaluationImportData | null> {
    if (!this.currentUserId) {
      return this.localEvaluationData ? JSON.parse(JSON.stringify(this.localEvaluationData)) : null;
    }

    try {
      const { data, error } = await supabase
        .from('terrascope_evaluations')
        .select('*')
        .eq('user_id', this.currentUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Evaluation load failed: ${error.message}`);
      }

      if (data) {
        if (data.original_report && typeof data.original_report === 'object' &&
            Array.isArray(data.original_report.classes)) {
          this.localEvaluationData = data.original_report as EvaluationImportData;
          return this.localEvaluationData;
        }
        const metrics = data.metrics || {};
        const parsed: EvaluationImportData = {
          project: metrics.project || 'TerraScope AI',
          practice_mode: Boolean(metrics.practice_mode),
          model_name: data.model_name || 'baseline_cnn',
          classes: Array.isArray(data.class_names) ? data.class_names : [],
          dataset: metrics.dataset || {
            train_images: 0,
            validation_images: 0,
            test_images: 0,
          },
          metrics: {
            accuracy: metrics.accuracy,
            macro_f1: metrics.macro_f1,
          },
          confusion_matrix: Array.isArray(data.confusion_matrix) ? data.confusion_matrix : [],
          model_comparison: Array.isArray(data.model_comparison) ? data.model_comparison : [],
          importedAt: metrics.imported_at || data.created_at,
        };

        this.localEvaluationData = parsed;
        return parsed;
      }
    } catch (e) {
      throw e;
    }

    return this.localEvaluationData;
  }

  async saveEvaluationResults(data: EvaluationImportData): Promise<{ success: boolean; isDuplicate?: boolean; error?: string }> {
    if (!this.currentUserId) {
      return { success: false, error: 'Sign in to save evaluation results to the cloud.' };
    }

    try {
      // importedAt is generated on each import; exclude it from the deduplication hash.
      const serialized = JSON.stringify({ ...data, importedAt: undefined });
      const hash = await computeContentHash(serialized);

      // Check for duplicate import hash
      const { data: existing } = await supabase
        .from('terrascope_evaluations')
        .select('id, created_at')
        .eq('user_id', this.currentUserId)
        .eq('import_hash', hash)
        .maybeSingle();

      if (existing) {
        this.localEvaluationData = JSON.parse(JSON.stringify(data));
        return { success: true, isDuplicate: true };
      }

      const evaluationId = crypto.randomUUID();
      const payload = {
        id: evaluationId,
        user_id: this.currentUserId,
        import_hash: hash,
        model_name: data.model_name,
        source_type: data.practice_mode ? 'synthetic' : 'official',
        class_names: data.classes,
        original_report: data,
        metrics: {
          accuracy: data.metrics.accuracy,
          macro_f1: data.metrics.macro_f1,
          dataset: data.dataset,
          project: data.project,
          practice_mode: data.practice_mode,
          imported_at: data.importedAt || new Date().toISOString(),
          raw_data: data,
        },
        confusion_matrix: data.confusion_matrix,
        model_comparison: data.model_comparison || [],
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('terrascope_evaluations')
        .insert(payload);

      if (error) {
        console.error('Failed to insert evaluation into Supabase:', error.message);
        return { success: false, error: error.message };
      }

      this.localEvaluationData = JSON.parse(JSON.stringify(data));
      this.lastSyncTimestamp = new Date().toISOString();
      return { success: true, isDuplicate: false };
    } catch (err: any) {
      console.error('Exception saving evaluation to Supabase:', err);
      return { success: false, error: err.message || 'Database insert failed' };
    }
  }

  async clearEvaluationResults(): Promise<void> {
    if (!this.currentUserId) throw new Error('Sign in before deleting cloud evaluation records.');
    const { error } = await supabase.from('terrascope_evaluations')
      .delete().eq('user_id', this.currentUserId);
    if (error) throw new Error(error.message);
    this.localEvaluationData = null;
  }

  // ==========================================
  // IMAGE TILE STORAGE
  // ==========================================

  async uploadTileImage(file: File): Promise<StoredImageRecord> {
    const predictionUuid = crypto.randomUUID();
    const uri = URL.createObjectURL(file);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        let storageKey = `tiles/${predictionUuid}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        if (this.currentUserId) {
          const uploadRes = await uploadImageToPrivateBucket(
            this.currentUserId,
            file,
            predictionUuid,
            file.name
          );
          if (!uploadRes.error) {
            storageKey = uploadRes.storagePath;
          }
        }

        resolve({
          storageKey,
          filename: file.name,
          mimeType: file.type || 'image/jpeg',
          sizeBytes: file.size,
          width: img.naturalWidth || 160,
          height: img.naturalHeight || 160,
          uploadedAt: new Date().toISOString(),
          uri,
        });
      };
      img.onerror = () => {
        resolve({
          storageKey: `tiles/${predictionUuid}-${file.name}`,
          filename: file.name,
          mimeType: file.type || 'image/jpeg',
          sizeBytes: file.size,
          width: 160,
          height: 160,
          uploadedAt: new Date().toISOString(),
          uri,
        });
      };
      img.src = uri;
    });
  }

  // ==========================================
  // BACKUP & EXPORT
  // ==========================================

  async exportAllUserData(): Promise<UserDataBackup> {
    if (!this.currentUserId) throw new Error('Sign in before exporting your cloud data.');
    const predictions = await this.getClassificationHistory();
    const evaluations: EvaluationImportData[] = [];
    const evaluationQuery = await supabase.from('terrascope_evaluations')
      .select('original_report, metrics, model_name, class_names, confusion_matrix, model_comparison, created_at')
      .eq('user_id', this.currentUserId)
      .order('created_at', { ascending: false });
    if (evaluationQuery.error) throw new Error(evaluationQuery.error.message);
    for (const row of evaluationQuery.data || []) {
      if (row.original_report && Array.isArray(row.original_report.classes)) {
        evaluations.push(row.original_report as EvaluationImportData);
      } else {
        evaluations.push({
          project: row.metrics?.project || 'TerraScope AI',
          practice_mode: Boolean(row.metrics?.practice_mode),
          model_name: row.model_name,
          classes: row.class_names || [],
          dataset: row.metrics?.dataset || { train_images: 0, validation_images: 0, test_images: 0 },
          metrics: { accuracy: row.metrics?.accuracy, macro_f1: row.metrics?.macro_f1 },
          confusion_matrix: row.confusion_matrix || [],
          model_comparison: row.model_comparison || [],
          importedAt: row.created_at,
        });
      }
    }

    let reviewEvents: ReviewEventRecord[] = [];
    if (this.currentUserId) {
      try {
        const { data, error } = await supabase
          .from('terrascope_review_events')
          .select('*')
          .eq('user_id', this.currentUserId)
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        if (data) {
          reviewEvents = data.map((r) => ({
            id: r.id,
            predictionId: r.prediction_id,
            userId: r.user_id,
            action: r.action,
            previousStatus: r.previous_status,
            newStatus: r.new_status,
            assignedClass: r.assigned_class || undefined,
            notes: r.notes || undefined,
            createdAt: r.created_at,
          }));
        }
      } catch (e) {
        throw new Error('Review history could not be exported; backup cancelled rather than returning incomplete data.');
      }
    }

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      userId: this.currentUserId || undefined,
      settings: {
        classes: this.localClasses,
        reviewThreshold: this.localPreferences.reviewThreshold,
        modelEndpointConfig: this.localEndpointConfig,
        userPreferences: this.localPreferences,
      },
      predictions,
      reviewEvents,
      evaluations,
    };
  }

  /**
   * Restores data from a user-supplied JSON backup
   */
  async importBackupData(backup: UserDataBackup): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      if (!backup || !backup.settings) {
        return { success: false, count: 0, error: 'Invalid backup structure' };
      }

      // Restore classes
      if (Array.isArray(backup.settings.classes)) {
        await this.saveClassTaxonomy(backup.settings.classes);
      }
      if (backup.settings.reviewThreshold) {
        await this.saveUserPreferences({ reviewThreshold: backup.settings.reviewThreshold });
      }

      // Restore evaluations
      if (Array.isArray(backup.evaluations) && backup.evaluations.length > 0) {
        const saved = await this.saveEvaluationResults(backup.evaluations[0]);
        if (!saved.success) throw new Error(saved.error || 'Evaluation restore failed');
      }

      // Restore predictions
      let importedPredictions = 0;
      if (Array.isArray(backup.predictions)) {
        for (const p of backup.predictions) {
          if (!p.isExample) {
            const saved = await this.recordPrediction(p);
            if (!saved.success) throw new Error(saved.error || `Prediction restore failed: ${p.id}`);
            importedPredictions++;
          }
        }
      }

      return { success: true, count: importedPredictions };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Backup restore failed' };
    }
  }
}

// Export singleton storage service instance
export const storageService = new SupabaseStorageService();
