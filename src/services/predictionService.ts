import { ClassScore, LandUseClass, ModelEndpointConfig, PredictionResult } from '../types/prediction';
import { browserTFLiteEngine, DEFAULT_METADATA_URL, DEFAULT_TFLITE_URL } from './tfliteService';

export class ModelNotConnectedError extends Error {
  constructor(
    message = 'Live inference is not configured. The trained model has not been connected to the web client yet.'
  ) {
    super(message);
    this.name = 'ModelNotConnectedError';
  }
}

export class UnsupportedImageError extends Error {
  constructor(message = 'Invalid or corrupted image format. Please supply a valid JPG or PNG file under 10MB.') {
    super(message);
    this.name = 'UnsupportedImageError';
  }
}

export interface PredictionServiceOptions {
  classes: LandUseClass[];
  reviewThreshold: number; // default 0.70
  endpointConfig: ModelEndpointConfig;
}

export class PredictionService {
  private classes: LandUseClass[];
  private reviewThreshold: number;
  private endpointConfig: ModelEndpointConfig;

  constructor(options: PredictionServiceOptions) {
    this.classes = options.classes;
    this.reviewThreshold = options.reviewThreshold;
    this.endpointConfig = options.endpointConfig;
  }

  public updateConfig(classes: LandUseClass[], threshold: number, endpointConfig: ModelEndpointConfig) {
    this.classes = classes;
    this.reviewThreshold = threshold;
    this.endpointConfig = endpointConfig;
  }

  /**
   * Mode A: Illustrative Example Generator
   * Generates explicitly marked UI fixtures for testing layouts, review threshold flagging,
   * and bar charts without pretending to perform inference on the uploaded image.
   */
  public generateIllustrativeExample(
    imageMetadata: { name: string; width: number; height: number; sizeBytes: number; dataUrl: string },
    variant: 'high_confidence' | 'low_confidence_flagged' | 'custom_tile' = 'high_confidence',
    primaryClassName?: string
  ): PredictionResult {
    // Determine target primary class based on available classes
    const classNames = this.classes.map((c) => c.name);
    if (classNames.length === 0) {
      classNames.push('agriculture', 'built_up', 'forest', 'water');
    }

    const topClass =
      primaryClassName && classNames.includes(primaryClassName)
        ? primaryClassName
        : classNames[0];

    const otherClasses = classNames.filter((c) => c !== topClass);
    let classScores: ClassScore[] = [];

    if (variant === 'high_confidence') {
      const topScore = 0.82;
      classScores.push({ label: topClass, score: topScore });

      if (otherClasses.length > 0) {
        const remainingBudget = Number((1.0 - topScore).toFixed(4));
        const weights = otherClasses.map((_, i) => Math.pow(0.5, i));
        const sumWeights = weights.reduce((acc, w) => acc + w, 0);

        let runningSum = 0;
        const otherScores = weights.map((w, idx) => {
          if (idx === otherClasses.length - 1) {
            const lastScore = Math.max(0.001, Number((remainingBudget - runningSum).toFixed(3)));
            return lastScore;
          }
          const s = Math.max(0.001, Number(((w / sumWeights) * remainingBudget).toFixed(3)));
          runningSum += s;
          return s;
        });

        otherClasses.forEach((cls, idx) => {
          classScores.push({ label: cls, score: otherScores[idx] });
        });
      }
    } else if (variant === 'low_confidence_flagged') {
      const topScore = 0.58;
      classScores.push({ label: topClass, score: topScore });

      if (otherClasses.length > 0) {
        const remainingBudget = Number((1.0 - topScore).toFixed(4));
        const weights = otherClasses.map((_, i) => Math.pow(0.55, i));
        const sumWeights = weights.reduce((acc, w) => acc + w, 0);

        let runningSum = 0;
        const otherScores = weights.map((w, idx) => {
          if (idx === otherClasses.length - 1) {
            const lastScore = Math.max(0.001, Number((remainingBudget - runningSum).toFixed(3)));
            return lastScore;
          }
          const s = Math.max(0.001, Number(((w / sumWeights) * remainingBudget).toFixed(3)));
          runningSum += s;
          return s;
        });

        otherClasses.forEach((cls, idx) => {
          classScores.push({ label: cls, score: otherScores[idx] });
        });
      }
    } else {
      const topScore = 0.78;
      classScores.push({ label: topClass, score: topScore });

      if (otherClasses.length > 0) {
        const remainingBudget = Number((1.0 - topScore).toFixed(4));
        const equalShare = Number((remainingBudget / otherClasses.length).toFixed(3));
        otherClasses.forEach((c, idx) => {
          if (idx === otherClasses.length - 1) {
            const remainder = Math.max(
              0.001,
              Number((1.0 - topScore - equalShare * (otherClasses.length - 1)).toFixed(3))
            );
            classScores.push({ label: c, score: remainder });
          } else {
            classScores.push({ label: c, score: equalShare });
          }
        });
      }
    }

    // Sort descending by score
    classScores.sort((a, b) => b.score - a.score);
    const top = classScores[0];
    const reviewRecommended = top.score < this.reviewThreshold;

    return {
      id: `example-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      predictedClass: top.label,
      modelScore: top.score,
      classScores,
      reviewRecommended,
      scoreThresholdUsed: this.reviewThreshold,
      modelVersion: 'colab-prototype-v0 (illustrative fixture)',
      inferenceMs: undefined,
      isExample: true,
      timestamp: new Date().toISOString(),
      imageMetadata,
      reviewStatus: reviewRecommended ? 'flagged' : 'pending',
    };
  }

  /**
   * Mode B: Real Inference Mode
   * If modelType is 'tflite_web', executes in-browser WebAssembly TFLite inference.
   * If modelType is 'keras_rest', executes HTTP predict request.
   * Under no circumstances will it fabricate a prediction or silently fall back to an example.
   */
  public async classifyRealImage(
    _imageFile: File | null,
    _imageMetadata: { name: string; width: number; height: number; sizeBytes: number; dataUrl: string }
  ): Promise<PredictionResult> {
    if (this.endpointConfig.status !== 'connected') {
      throw new ModelNotConnectedError();
    }

    // Pathway 1: Browser-based TensorFlow Lite WebAssembly Inference
    if (this.endpointConfig.modelType === 'tflite_web') {
      if (!browserTFLiteEngine.isReady()) {
        throw new Error(
          'TensorFlow Lite model is not loaded or passed verification. Please reconnect via the Model Connection modal.'
        );
      }
      return await browserTFLiteEngine.classifyImage(
        _imageMetadata.dataUrl,
        _imageMetadata,
        this.reviewThreshold
      );
    }

    // Pathway 2: External HTTP Endpoint
    if (!this.endpointConfig.endpointUrl) {
      throw new ModelNotConnectedError('External model endpoint URL is not configured.');
    }

    try {
      const response = await fetch(`${this.endpointConfig.endpointUrl.replace(/\/$/, '')}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: _imageMetadata.dataUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`Inference endpoint returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const topScore = Number(data.top_score);
      const isBelowThreshold = topScore < this.reviewThreshold;

      return {
        id: `real-${Date.now()}`,
        predictedClass: data.predicted_class,
        modelScore: topScore,
        classScores: data.class_scores || [],
        reviewRecommended: isBelowThreshold,
        scoreThresholdUsed: this.reviewThreshold,
        modelVersion: data.model_version || this.endpointConfig.metadata?.modelName || 'keras-colab-v1',
        inferenceMs: typeof data.inference_ms === 'number' ? data.inference_ms : undefined,
        isExample: false,
        timestamp: new Date().toISOString(),
        imageMetadata: _imageMetadata,
        reviewStatus: isBelowThreshold ? 'flagged' : 'pending',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Live inference failed: ${message}`);
    }
  }

  /**
   * Connect and verify the hosted TFLite model and metadata
   */
  public async connectTFLiteModel(
    modelUrl = DEFAULT_TFLITE_URL,
    metadataUrl = DEFAULT_METADATA_URL
  ) {
    return await browserTFLiteEngine.loadAndVerify(modelUrl, metadataUrl);
  }

  /**
   * Ping / Test model connection endpoint and inspect real model metadata
   */
  public async testEndpointConnection(url: string): Promise<{ success: boolean; message: string; modelDetails?: any }> {
    if (!url || !url.startsWith('http')) {
      return {
        success: false,
        message: 'Endpoint URL must begin with http:// or https://.',
      };
    }

    try {
      const response = await fetch(`${url.replace(/\/$/, '')}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          success: true,
          message: 'Endpoint reachable and responded to health probe.',
          modelDetails: data,
        };
      } else {
        return {
          success: false,
          message: `Endpoint responded with HTTP ${response.status}. Expected 200 OK from /health.`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Connection probe failed: ${err.message || 'Network unreachable'}. Live inference server is not currently reachable at this address.`,
      };
    }
  }
}
