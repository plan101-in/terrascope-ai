import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Cpu,
  Database,
  Filter,
  Layers,
  ListOrdered,
  Maximize2,
  Minimize2,
  Scale,
  ShieldCheck,
  Split,
  Workflow,
} from 'lucide-react';

export const MethodologyView: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Satellite Tile Ingestion',
      subtitle: 'Orthorectified Earth Observation Inputs',
      description:
        'Standardized intake of true-color RGB multispectral satellite tiles (e.g. Sentinel-2 / Landsat 8-9 resolution). Image tiles are verified for valid dimensions, band integrity, and absence of corrupted nodata voids.',
      details: [
        'Supported formats: JPG, JPEG, PNG (8-bit per channel)',
        'Tile size budget: 64×64 px to 512×512 px typical spatial resolution',
        'Strict tile-level classification: one dominant land-use category per input tile',
      ],
    },
    {
      num: '02',
      title: 'Inspection & Preprocessing',
      subtitle: 'Tensor Scaling & Augmentation Pipeline',
      description:
        'Standardization of raw raster arrays into normalized floating-point tensors suitable for convolutional gradient descent.',
      details: [
        'Resizing to uniform model input dimensions (224×224×3)',
        'Min-max pixel normalization: scaling raw uint8 [0, 255] values to [0.0, 1.0]',
        'Colab Data Augmentation: Random horizontal/vertical flips, 90° rotations, and minor brightness jitter to promote rotational invariance across aerial orientations',
      ],
    },
    {
      num: '03',
      title: 'Stratified Data Splitting',
      subtitle: 'Leakage Prevention & Class Balance',
      description:
        'Partitioning competition imagery to evaluate true model generalization while ensuring minority classes are proportionately represented across every partition.',
      details: [
        '70% Training / 15% Validation / 15% Held-out Test partition',
        'Stratified sampling by land-use category to prevent class skew',
        'Spatial isolation: tiles from adjacent geographic coordinates are partitioned into the same split to avoid spatial autocorrelation leakage',
      ],
    },
    {
      num: '04',
      title: 'Baseline Custom CNN Training',
      subtitle: 'Lightweight Convolutional Feature Extraction',
      description:
        'Training a custom 4-stage convolutional neural network from random initialization in Google Colab using TensorFlow/Keras.',
      details: [
        'Conv2D layers (32, 64, 128, 256 filters) with 3×3 receptive fields',
        'Batch Normalization after each convolution for stable gradient flow',
        'Spatial MaxPooling and Dropout (0.3) for regularization',
        'Dense classification head with softmax activation over dynamic classes',
      ],
    },
    {
      num: '05',
      title: 'MobileNetV2 Transfer Learning',
      subtitle: 'Inverted Residual Bottlenecks Benchmark',
      description:
        'Benchmarking the custom CNN against a pre-trained MobileNetV2 architecture leveraging ImageNet weights with fine-tuned top layers.',
      details: [
        'Frozen base layers for initial feature transfer',
        'Global Average Pooling 2D layer reducing parameter count',
        'Gradual unfreezing of top convolutional blocks with low learning rate (1e-5)',
        'Categorical cross-entropy loss optimized via Adam',
      ],
    },
    {
      num: '06',
      title: 'Model Selection on Validation Performance',
      subtitle: 'Objective Optimization on Macro-F1',
      description:
        'Selecting the superior model architecture using validation performance rather than training loss to eliminate overfitting bias.',
      details: [
        'Macro-F1 used as primary selection metric to prevent majority-class bias',
        'Early stopping with patience = 5 epochs on validation loss',
        'Checkpointed best weights saved in Keras .h5 / SavedModel format',
      ],
    },
    {
      num: '07',
      title: 'Final Held-Out Test Evaluation',
      subtitle: 'Single-Pass Unbiased Verification',
      description:
        'Running the frozen winning model against the 15% held-out test split exactly once to determine official competition performance metrics.',
      details: [
        'Generation of full confusion matrix and class-level precision/recall',
        'Calculation of average inference latency per tile under standard GPU/CPU runtime',
        'Verification of calibration curve across prediction confidence bands',
      ],
    },
    {
      num: '08',
      title: 'Human-in-the-Loop Review Gate',
      subtitle: 'Threshold-Driven Planner Verification',
      description:
        'Recognizing that raw softmax scores represent uncalibrated model scores rather than guaranteed ground-truth probabilities, scores below 0.70 are flagged for human review.',
      details: [
        'Configurable threshold (default 0.70)',
        'Automatic routing to Planner Review Queue for visual verification',
        'Audit logging of human approvals and reclassifications',
      ],
    },
  ];

  return (
    <div className="space-y-8 py-2">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>Machine Learning Architecture</span>
          <span aria-hidden="true">·</span>
          <span>AI Sansad Round 2 Pipeline</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#102B46]">
          Proposed Classification Methodology
        </h2>
        <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
          TerraScope AI employs a disciplined, eight-stage machine learning methodology specifically tailored for satellite-image tile classification. The approach balances empirical rigor, transfer learning efficiency, and human oversight.
        </p>
      </div>

      {/* Methodology Stages List */}
      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.num}
            className="p-5 sm:p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-bold text-[#1779B8]">
                  {step.num}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {step.title}
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {step.subtitle}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {step.description}
            </p>

            <div className="pt-1">
              <ul className="space-y-1.5 text-xs text-slate-600">
                {step.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#1779B8] font-bold">›</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Boundary & Scope Specification (Mandatory Honesty Rule) */}
      <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#102B46]" />
          <h3 className="text-base font-bold text-[#102B46]">
            Technical Scope & Research Boundaries
          </h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          To ensure clarity and credibility in competition evaluations, the technical scope of this system is explicitly demarcated below:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Current In-Scope */}
          <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#24845A]">
              <CheckCircle2 className="w-4 h-4" />
              <span>CURRENT ROUND 2 IMPLEMENTATION</span>
            </div>
            <ul className="space-y-1 text-xs text-slate-600">
              <li>• Single satellite-image tile categorization</li>
              <li>• Softmax score generation across dynamic classes</li>
              <li>• Threshold-based human-in-the-loop review gating</li>
              <li>• Decoupled inference adapter architecture</li>
              <li>• Unbiased evaluation suite structure for held-out splits</li>
            </ul>
          </div>

          {/* Out of Scope / Not Claimed */}
          <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>FUTURE RESEARCH ROADMAP (NOT CURRENTLY CLAIMED)</span>
            </div>
            <ul className="space-y-1 text-xs text-slate-600">
              <li>• <strong>No Pixel-Level Semantic Segmentation:</strong> Whole-tile categorization, not UNet pixel masks.</li>
              <li>• <strong>No Object Detection:</strong> Not locating individual bounding-box vehicles/structures.</li>
              <li>• <strong>No Continuous GIS Vector Mapping:</strong> Tile classification, not full-scale geo-rectified shapefiles.</li>
              <li>• <strong>No Temporal Change Detection:</strong> Single-epoch imagery, not multi-year diffing.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
