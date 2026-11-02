import { EvaluationImportData, ModelComparisonEntry } from '../types/prediction';

export interface ValidationResult {
  valid: boolean;
  data?: EvaluationImportData;
  error?: string;
}

export function validateEvaluationJson(jsonText: string): ValidationResult {
  if (!jsonText || !jsonText.trim()) {
    return { valid: false, error: 'Input is empty. Please paste your Colab evaluation JSON.' };
  }

  let raw: any;
  try {
    raw = JSON.parse(jsonText);
  } catch (err: any) {
    return { valid: false, error: `JSON Parse Error: ${err.message || 'Malformed JSON syntax'}` };
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { valid: false, error: 'Evaluation data must be a JSON object.' };
  }

  // 1. practice_mode: boolean
  if (typeof raw.practice_mode !== 'boolean') {
    return { valid: false, error: 'Missing or invalid "practice_mode": must be a boolean (true or false).' };
  }

  // 2. model_name: string
  if (typeof raw.model_name !== 'string' || !raw.model_name.trim()) {
    return { valid: false, error: 'Missing or invalid "model_name": must be a non-empty string.' };
  }

  // 3. classes: string[]
  if (!Array.isArray(raw.classes) || raw.classes.length < 2) {
    return { valid: false, error: 'Missing or invalid "classes": must be an array of at least 2 class labels.' };
  }

  for (let i = 0; i < raw.classes.length; i++) {
    const c = raw.classes[i];
    if (typeof c !== 'string' || !c.trim()) {
      return { valid: false, error: `Invalid class name at index ${i}: must be a non-empty string.` };
    }
  }

  // Check unique classes
  const uniqueClasses = new Set(raw.classes.map((c: string) => c.trim().toLowerCase()));
  if (uniqueClasses.size !== raw.classes.length) {
    return { valid: false, error: 'Duplicate class names detected in "classes" array.' };
  }

  // 4. dataset: { train_images, validation_images, test_images }
  if (typeof raw.dataset !== 'object' || raw.dataset === null) {
    return { valid: false, error: 'Missing "dataset" object containing train_images, validation_images, and test_images.' };
  }

  const { train_images, validation_images, test_images } = raw.dataset;
  if (!Number.isInteger(train_images) || train_images < 0) {
    return { valid: false, error: 'dataset.train_images must be a non-negative integer.' };
  }
  if (!Number.isInteger(validation_images) || validation_images < 0) {
    return { valid: false, error: 'dataset.validation_images must be a non-negative integer.' };
  }
  if (!Number.isInteger(test_images) || test_images < 0) {
    return { valid: false, error: 'dataset.test_images must be a non-negative integer.' };
  }

  // 5. metrics: { accuracy, macro_f1 }
  if (typeof raw.metrics !== 'object' || raw.metrics === null) {
    return { valid: false, error: 'Missing "metrics" object containing accuracy and macro_f1.' };
  }

  const { accuracy, macro_f1 } = raw.metrics;
  if (typeof accuracy !== 'number' || isNaN(accuracy) || accuracy < 0.0 || accuracy > 1.0) {
    return { valid: false, error: 'metrics.accuracy must be a number between 0.0 and 1.0 (e.g. 0.85 for 85%).' };
  }
  if (typeof macro_f1 !== 'number' || isNaN(macro_f1) || macro_f1 < 0.0 || macro_f1 > 1.0) {
    return { valid: false, error: 'metrics.macro_f1 must be a number between 0.0 and 1.0.' };
  }

  // 6. confusion_matrix: number[][]
  if (!Array.isArray(raw.confusion_matrix)) {
    return { valid: false, error: 'Missing or invalid "confusion_matrix": must be a 2D array.' };
  }

  const numClasses = raw.classes.length;
  if (raw.confusion_matrix.length !== numClasses) {
    return {
      valid: false,
      error: `confusion_matrix has ${raw.confusion_matrix.length} rows, but "classes" has ${numClasses}. Matrix must be ${numClasses}x${numClasses}.`,
    };
  }

  let matrixTotal = 0;
  for (let r = 0; r < numClasses; r++) {
    const row = raw.confusion_matrix[r];
    if (!Array.isArray(row) || row.length !== numClasses) {
      return {
        valid: false,
        error: `Row ${r} in confusion_matrix has ${Array.isArray(row) ? row.length : 'invalid'} columns; expected ${numClasses}.`,
      };
    }
    for (let c = 0; c < numClasses; c++) {
      const val = row[c];
      if (!Number.isInteger(val) || val < 0) {
        return {
          valid: false,
          error: `Cell [${r}][${c}] in confusion_matrix (${val}) must be a non-negative integer.`,
        };
      }
      matrixTotal += val;
    }
  }

  // Check consistency: matrix total should equal test_images
  if (test_images > 0 && matrixTotal !== test_images) {
    return {
      valid: false,
      error: `Inconsistent counts: confusion_matrix cell sum (${matrixTotal}) does not match dataset.test_images (${test_images}).`,
    };
  }

  // 7. model_comparison: optional array of { model, val_accuracy, val_macro_f1 }
  let validatedComparison: ModelComparisonEntry[] | undefined = undefined;
  if (raw.model_comparison !== undefined) {
    if (!Array.isArray(raw.model_comparison)) {
      return { valid: false, error: '"model_comparison" must be an array of model comparison objects.' };
    }
    validatedComparison = [];
    for (let i = 0; i < raw.model_comparison.length; i++) {
      const item = raw.model_comparison[i];
      if (typeof item !== 'object' || item === null) {
        return { valid: false, error: `model_comparison item at index ${i} is not an object.` };
      }
      if (typeof item.model !== 'string' || !item.model.trim()) {
        return { valid: false, error: `model_comparison[${i}].model must be a non-empty string.` };
      }
      if (typeof item.val_accuracy !== 'number' || isNaN(item.val_accuracy) || item.val_accuracy < 0.0 || item.val_accuracy > 1.0) {
        return { valid: false, error: `model_comparison[${i}].val_accuracy must be a number between 0.0 and 1.0.` };
      }
      if (typeof item.val_macro_f1 !== 'number' || isNaN(item.val_macro_f1) || item.val_macro_f1 < 0.0 || item.val_macro_f1 > 1.0) {
        return { valid: false, error: `model_comparison[${i}].val_macro_f1 must be a number between 0.0 and 1.0.` };
      }
      validatedComparison.push({
        model: item.model.trim(),
        val_accuracy: item.val_accuracy,
        val_macro_f1: item.val_macro_f1,
      });
    }
  }

  const validatedData: EvaluationImportData = {
    project: typeof raw.project === 'string' ? raw.project.trim() : 'TerraScope AI',
    practice_mode: raw.practice_mode,
    model_name: raw.model_name.trim(),
    classes: raw.classes.map((c: string) => c.trim()),
    dataset: {
      train_images,
      validation_images,
      test_images,
    },
    metrics: {
      accuracy,
      macro_f1,
    },
    confusion_matrix: raw.confusion_matrix,
    model_comparison: validatedComparison,
    importedAt: new Date().toISOString(),
  };

  return { valid: true, data: validatedData };
}

export const SAMPLE_EVALUATION_TEMPLATE = `{
  "project": "TerraScope AI",
  "practice_mode": true,
  "model_name": "baseline_cnn",
  "classes": ["agriculture", "built_up", "forest", "water"],
  "dataset": {
    "train_images": 100,
    "validation_images": 24,
    "test_images": 20
  },
  "metrics": {
    "accuracy": 1.0,
    "macro_f1": 1.0
  },
  "confusion_matrix": [
    [5, 0, 0, 0],
    [0, 5, 0, 0],
    [0, 0, 5, 0],
    [0, 0, 0, 5]
  ],
  "model_comparison": [
    {
      "model": "baseline_cnn",
      "val_accuracy": 1.0,
      "val_macro_f1": 1.0
    }
  ]
}`;
