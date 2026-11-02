import * as tf from '@tensorflow/tfjs';
import * as tflite from '@tensorflow/tfjs-tflite';
import { BrowserModelMetadata, ClassScore, PredictionResult } from '../types/prediction';

export const DEFAULT_TFLITE_URL = 'https://plan101-in.github.io/terrascope-model/terrascope_model.tflite';
export const DEFAULT_METADATA_URL = 'https://plan101-in.github.io/terrascope-model/browser_model_metadata.json';

let wasmConfigured = false;

/**
 * Configure the WebAssembly runtime for @tensorflow/tfjs-tflite.
 * Prefers the local /wasm/ endpoint served by Vite with fallback to verified CDN.
 */
export function setupTFLiteWasm(customPath?: string) {
  if (wasmConfigured && !customPath) return;
  const path = customPath || '/wasm/';
  try {
    tflite.setWasmPath(path);
    wasmConfigured = true;
  } catch (err) {
    console.warn(`Local WASM path (${path}) setting failed, trying jsdelivr CDN fallback`, err);
    try {
      tflite.setWasmPath('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/wasm/');
      wasmConfigured = true;
    } catch (cdnErr) {
      console.error('All WASM path configuration attempts failed', cdnErr);
    }
  }
}

/**
 * Fetch and validate the browser model metadata JSON from the given URL.
 */
export async function fetchModelMetadata(metadataUrl: string): Promise<BrowserModelMetadata> {
  const res = await fetch(metadataUrl, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`Failed to fetch model metadata from ${metadataUrl} (HTTP ${res.status}: ${res.statusText})`);
  }
  const data = await res.json();

  if (!data || !Array.isArray(data.class_names) || data.class_names.length === 0) {
    throw new Error('Invalid model metadata: "class_names" array is missing or empty.');
  }

  const imageSize = data.image_size || (Array.isArray(data.input_shape) ? data.input_shape[1] : 160);
  if (!imageSize || imageSize <= 0) {
    throw new Error('Invalid model metadata: input dimensions (image_size / input_shape) are missing.');
  }

  return {
    project: data.project || 'TerraScope AI',
    model_format: data.model_format || 'tflite',
    model_version: data.model_version || 'baseline_cnn',
    practice_mode: data.practice_mode !== undefined ? Boolean(data.practice_mode) : true,
    synthetic_data: data.synthetic_data !== undefined ? Boolean(data.synthetic_data) : true,
    class_names: data.class_names,
    image_size: imageSize,
    input_shape: data.input_shape || [1, imageSize, imageSize, 3],
    input_dtype: data.input_dtype || 'float32',
    input_color_format: data.input_color_format || 'RGB',
    input_pixel_range: data.input_pixel_range || [0, 255],
    preprocessing:
      data.preprocessing ||
      'Pass RGB float32 pixels in the 0–255 range. Normalization is embedded in the saved model.',
    review_threshold: typeof data.review_threshold === 'number' ? data.review_threshold : 0.70,
    model_sha256: data.model_sha256,
  };
}

/**
 * Fetch and validate the TFLite binary file from the given URL.
 */
export async function fetchTFLiteBinary(modelUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(modelUrl, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`Failed to download TFLite model from ${modelUrl} (HTTP ${res.status}: ${res.statusText})`);
  }
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength < 1000) {
    throw new Error(
      `TFLite model file at ${modelUrl} is too small (${buffer.byteLength} bytes) or corrupted.`
    );
  }
  return buffer;
}

export class BrowserTFLiteEngine {
  private model: tflite.TFLiteModel | null = null;
  private metadata: BrowserModelMetadata | null = null;
  private verified = false;
  private isInitializing = false;

  public isReady(): boolean {
    return this.model !== null && this.verified;
  }

  public getMetadata(): BrowserModelMetadata | null {
    return this.metadata;
  }

  /**
   * Loads both the metadata JSON and the TFLite binary, initializes the WebAssembly
   * runtime, and executes an automated test inference to verify the end-to-end pipeline.
   */
  public async loadAndVerify(
    modelUrl = DEFAULT_TFLITE_URL,
    metadataUrl = DEFAULT_METADATA_URL
  ): Promise<{ metadata: BrowserModelMetadata; testLatencyMs: number }> {
    if (this.isInitializing) {
      throw new Error('Model initialization is already in progress.');
    }

    this.isInitializing = true;
    try {
      setupTFLiteWasm();
      await tf.ready();

      // Fetch both assets in parallel
      const [metadata, modelBuffer] = await Promise.all([
        fetchModelMetadata(metadataUrl),
        fetchTFLiteBinary(modelUrl),
      ]);

      // Load model into @tensorflow/tfjs-tflite WebAssembly interpreter
      const loadedModel = await tflite.loadTFLiteModel(modelBuffer);

      // Automated Verification / Inference Test:
      // Run dummy float32 RGB input matching required dimensions [1, image_size, image_size, 3] in [0, 255]
      const targetSize = metadata.image_size || 160;
      const testStart = performance.now();

      let testOutputScores: number[] = [];
      tf.tidy(() => {
        const dummyTensor = tf.zeros([1, targetSize, targetSize, 3], 'float32');
        const out = loadedModel.predict(dummyTensor as any) as any;
        testOutputScores = Array.from(out.dataSync()) as number[];
      });
      const testLatencyMs = Math.max(1, Math.round(performance.now() - testStart));

      if (!testOutputScores || testOutputScores.length !== metadata.class_names.length) {
        throw new Error(
          `Inference test failed: Model output tensor length (${testOutputScores?.length || 0}) does not match metadata class count (${metadata.class_names.length}).`
        );
      }

      this.model = loadedModel;
      this.metadata = metadata;
      this.verified = true;

      return { metadata, testLatencyMs };
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Executes real TFLite inference on an image source according to competition specifications:
   * - Resizes to model input dimensions (e.g. 160x160)
   * - Uses RGB float32 pixel values in range [0, 255]
   * - Does not apply extraneous normalization (normalization is embedded in the model)
   * - Measures actual inference latency in milliseconds
   */
  public async classifyImage(
    imageSource: HTMLImageElement | HTMLCanvasElement | string,
    imageMetadata: { name: string; width: number; height: number; sizeBytes: number; dataUrl: string },
    reviewThresholdOverride?: number
  ): Promise<PredictionResult> {
    if (!this.model || !this.metadata || !this.verified) {
      throw new Error('TensorFlow Lite model is not loaded or verified. Please connect the model first.');
    }

    const imageElement = await this.resolveImageElement(imageSource);
    const targetSize = this.metadata.image_size || 160;

    const startTime = performance.now();
    let rawScores: number[] = [];
    tf.tidy(() => {
      // tf.browser.fromPixels extracts RGB pixels as int32 [H, W, 3] in range [0, 255]
      let tensor = tf.browser.fromPixels(imageElement);
      // Resize to required dimensions
      tensor = tf.image.resizeBilinear(tensor, [targetSize, targetSize]);
      // Convert to float32 (values remain in [0, 255] as specified in metadata)
      tensor = tensor.toFloat();
      // Expand batch dimension -> [1, 160, 160, 3]
      const batched = tensor.expandDims(0);
      const outputTensor = this.model!.predict(batched as any) as any;
      rawScores = Array.from(outputTensor.dataSync()) as number[];
    });
    const inferenceMs = Math.max(1, Math.round(performance.now() - startTime));

    // Handle scores
    let finalScores = rawScores;
    const sum = rawScores.reduce((acc, v) => acc + v, 0);
    // If output is raw unnormalized logits (sum not close to 1), apply softmax
    if (Math.abs(sum - 1.0) > 0.08) {
      const maxVal = Math.max(...rawScores);
      const expScores = rawScores.map((v) => Math.exp(v - maxVal));
      const expSum = expScores.reduce((acc, v) => acc + v, 0);
      finalScores = expScores.map((v) => v / expSum);
    }

    const classScores: ClassScore[] = this.metadata.class_names.map((name, idx) => ({
      label: name,
      score: Number((finalScores[idx] ?? 0).toFixed(4)),
    }));

    // Sort descending by score
    classScores.sort((a, b) => b.score - a.score);
    const top = classScores[0];

    const thresholdUsed = reviewThresholdOverride ?? this.metadata.review_threshold ?? 0.70;
    const reviewRecommended = top.score < thresholdUsed;

    return {
      id: `real-tflite-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      predictedClass: top.label,
      modelScore: top.score,
      classScores,
      reviewRecommended,
      scoreThresholdUsed: thresholdUsed,
      modelVersion: `${this.metadata.model_version || 'baseline_cnn'} (TFLite WASM)`,
      inferenceMs,
      isExample: false,
      isPracticeModel: Boolean(this.metadata.practice_mode || this.metadata.synthetic_data),
      timestamp: new Date().toISOString(),
      imageMetadata: {
        ...imageMetadata,
        width: imageElement instanceof HTMLImageElement ? imageElement.naturalWidth || targetSize : targetSize,
        height: imageElement instanceof HTMLImageElement ? imageElement.naturalHeight || targetSize : targetSize,
      },
      reviewStatus: reviewRecommended ? 'flagged' : 'pending',
    };
  }

  public disconnect() {
    this.model = null;
    this.metadata = null;
    this.verified = false;
  }

  private resolveImageElement(
    source: HTMLImageElement | HTMLCanvasElement | string
  ): Promise<HTMLImageElement | HTMLCanvasElement> {
    if (typeof source !== 'string') {
      return Promise.resolve(source);
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to decode image tile for TensorFlow Lite inference.'));
      img.src = source;
    });
  }
}

export const browserTFLiteEngine = new BrowserTFLiteEngine();
