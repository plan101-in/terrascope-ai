import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AboutView } from './components/AboutView';
import { AuthModal } from './components/AuthModal';
import { ClassificationView } from './components/ClassificationView';
import { ClassManagerModal } from './components/ClassManagerModal';
import { Dashboard } from './components/Dashboard';
import { EvaluationView } from './components/EvaluationView';
import { ActiveTab, Header } from './components/Header';
import { MethodologyView } from './components/MethodologyView';
import { ModelConnectionModal } from './components/ModelConnectionModal';
import { ReviewQueueView } from './components/ReviewQueueView';
import { INITIAL_LAND_USE_CLASSES } from './data/defaultClasses';
import { PredictionService } from './services/predictionService';
import { ReviewQueueService } from './services/reviewQueueService';
import { storageService } from './services/storageService';
import { supabase } from './services/supabaseClient';
import {
  browserTFLiteEngine,
  DEFAULT_METADATA_URL,
  DEFAULT_TFLITE_URL,
} from './services/tfliteService';
import {
  EvaluationImportData,
  ImageUploadState,
  LandUseClass,
  ModelEndpointConfig,
  PredictionResult,
  QueueItem,
} from './types/prediction';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [classes, setClasses] = useState<LandUseClass[]>(INITIAL_LAND_USE_CLASSES);
  const [reviewThreshold, setReviewThreshold] = useState<number>(0.70);

  // Supabase Auth & Session State
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // In-memory evaluation results imported from Colab JSON
  const [importedEvaluation, setImportedEvaluation] = useState<EvaluationImportData | null>(null);

  // Persistent image and prediction state across tab navigation
  const [currentImage, setCurrentImage] = useState<ImageUploadState | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);

  // Centralized blob URL lifecycle reference to prevent premature revocation on child unmount
  const activeBlobUrlRef = useRef<string | null>(null);

  const handleSetCurrentImage = (img: ImageUploadState | null) => {
    // If replacing or removing an image with a blob URL, revoke the prior one cleanly
    if (
      activeBlobUrlRef.current &&
      activeBlobUrlRef.current !== img?.dataUrl &&
      activeBlobUrlRef.current.startsWith('blob:')
    ) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
    if (img?.dataUrl && img.dataUrl.startsWith('blob:')) {
      activeBlobUrlRef.current = img.dataUrl;
    }
    setCurrentImage(img);
  };

  // Revoke active blob URL only when App unmounts (e.g. window close/reload)
  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current && activeBlobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
    };
  }, []);

  const [endpointConfig, setEndpointConfig] = useState<ModelEndpointConfig>({
    status: 'disconnected',
    endpointUrl: DEFAULT_TFLITE_URL,
    modelUrl: DEFAULT_TFLITE_URL,
    metadataUrl: DEFAULT_METADATA_URL,
    modelType: 'tflite_web',
    inputResolution: 160,
  });

  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);

  // Central review queue service
  const reviewQueueService = useMemo(() => new ReviewQueueService(), []);
  const [realQueue, setRealQueue] = useState<QueueItem[]>(() => reviewQueueService.getRealItems());
  const [exampleQueue, setExampleQueue] = useState<QueueItem[]>(() => reviewQueueService.getExampleItems());

  const refreshQueues = async () => {
    const queueData = await storageService.getReviewQueueItems();
    setRealQueue(queueData.real);
    setExampleQueue(queueData.example);
  };

  // Restore Supabase Auth session on mount and subscribe to auth state changes
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user && isMounted) {
          const user = data.session.user;
          setCurrentUser(user);
          storageService.setUser(user.id, user.email);

          // Restore settings, evaluations, and queue records from Supabase Cloud
          const settings = await storageService.loadUserSettings();
          if (settings) {
            if (settings.classes) setClasses(settings.classes);
            if (settings.reviewThreshold) setReviewThreshold(settings.reviewThreshold);
            if (settings.endpointConfig) setEndpointConfig(settings.endpointConfig);
          }

          const evalData = await storageService.getEvaluationResults();
          if (evalData) setImportedEvaluation(evalData);

          await refreshQueues();
        }
      } catch (err) {
        console.warn('Failed to restore Supabase session:', err);
      }
    };

    restoreSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const user = session.user;
        setCurrentUser(user);
        storageService.setUser(user.id, user.email);

        const settings = await storageService.loadUserSettings();
        if (settings) {
          if (settings.classes) setClasses(settings.classes);
          if (settings.reviewThreshold) setReviewThreshold(settings.reviewThreshold);
          if (settings.endpointConfig) setEndpointConfig(settings.endpointConfig);
        }

        const evalData = await storageService.getEvaluationResults();
        if (evalData) setImportedEvaluation(evalData);

        await refreshQueues();
      } else {
        setCurrentUser(null);
        storageService.setUser(null, null);
        await refreshQueues();
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Initialize prediction service
  const predictionService = useMemo(() => {
    return new PredictionService({
      classes,
      reviewThreshold,
      endpointConfig,
    });
  }, []);

  // Synchronize dynamic parameters with service
  predictionService.updateConfig(classes, reviewThreshold, endpointConfig);

  // Connect to hosted TFLite model and metadata on GitHub Pages
  const handleConnectTFLite = async (
    modelUrl = DEFAULT_TFLITE_URL,
    metadataUrl = DEFAULT_METADATA_URL
  ) => {
    setEndpointConfig((prev) => ({ ...prev, status: 'connecting', errorMessage: undefined }));
    try {
      const { metadata, testLatencyMs } = await predictionService.connectTFLiteModel(modelUrl, metadataUrl);

      // Synchronize class taxonomy dynamically from metadata (Requirement 6)
      const palette = ['#D5A23D', '#102B46', '#24845A', '#1779B8', '#8C7853', '#2E7D6F'];
      const classNames = metadata.class_names || ['agriculture', 'built_up', 'forest', 'water'];
      const updatedClasses: LandUseClass[] = classNames.map((clsName, idx) => {
        const existing = classes.find((c) => c.name.toLowerCase() === clsName.toLowerCase());
        if (existing) {
          return { ...existing, name: clsName };
        }
        return {
          id: clsName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          name: clsName,
          description: `Model land-use class '${clsName}'`,
          colorHex: palette[idx % palette.length],
        };
      });

      const newThreshold = metadata.review_threshold || 0.70;
      setClasses(updatedClasses);
      setReviewThreshold(newThreshold);

      const newConfig: ModelEndpointConfig = {
        status: 'connected',
        endpointUrl: modelUrl,
        modelUrl,
        metadataUrl,
        modelType: 'tflite_web',
        inputResolution: metadata.image_size || 160,
        lastTested: new Date().toISOString(),
        metadata: {
          modelName: metadata.model_version || 'baseline_cnn',
          inputShape: metadata.input_shape || [1, 160, 160, 3],
          classes: metadata.class_names,
          normalization: 'raw_0_255_float32',
          framework: 'TensorFlow Lite (WASM)',
          practiceMode: metadata.practice_mode,
          syntheticData: metadata.synthetic_data,
          modelSha256: metadata.model_sha256,
          browserMetadata: metadata,
        },
      };

      setEndpointConfig(newConfig);
      storageService.saveClassTaxonomy(updatedClasses);
      storageService.saveModelEndpointConfig(newConfig);
      predictionService.updateConfig(updatedClasses, newThreshold, newConfig);

      return {
        success: true,
        message: `Successfully connected and verified TensorFlow Lite model (${metadata.model_version || 'baseline_cnn'}). Test latency: ${testLatencyMs} ms.`,
      };
    } catch (err: any) {
      const msg = err.message || 'Failed to connect to hosted TensorFlow Lite model.';
      setEndpointConfig((prev) => ({
        ...prev,
        status: 'disconnected',
        errorMessage: msg,
      }));
      return { success: false, message: msg };
    }
  };

  const handleDisconnectModel = () => {
    browserTFLiteEngine.disconnect();
    const newConfig: ModelEndpointConfig = {
      status: 'disconnected',
      endpointUrl: '',
      modelUrl: DEFAULT_TFLITE_URL,
      metadataUrl: DEFAULT_METADATA_URL,
      modelType: 'tflite_web',
      inputResolution: 160,
      metadata: undefined,
    };
    setEndpointConfig(newConfig);
    storageService.saveModelEndpointConfig(newConfig);
    predictionService.updateConfig(classes, reviewThreshold, newConfig);
  };

  // Auto-connect to GitHub Pages model on initial mount
  useEffect(() => {
    let isCancelled = false;
    const runAutoConnect = async () => {
      try {
        await handleConnectTFLite(DEFAULT_TFLITE_URL, DEFAULT_METADATA_URL);
      } catch (e) {
        if (!isCancelled) {
          console.warn('Auto-connect to TFLite model deferred:', e);
        }
      }
    };
    runAutoConnect();
    return () => {
      isCancelled = true;
    };
  }, []);

  const handleAddToReviewQueue = (item: QueueItem) => {
    reviewQueueService.addToQueue(item);
    storageService.saveReviewQueueItem(item);
    refreshQueues();
  };

  const handleUpdateQueueStatus = (
    id: string,
    isExample: boolean,
    status: 'pending' | 'flagged' | 'approved' | 'reclassified',
    humanClass?: string,
    notes?: string
  ) => {
    reviewQueueService.updateStatus(id, isExample, status, humanClass, notes);
    storageService.updateReviewQueueStatus(id, isExample, status, humanClass, notes);
    refreshQueues();
  };

  const handleRemoveQueueItem = (id: string, isExample: boolean) => {
    reviewQueueService.removeItem(id, isExample);
    storageService.removeReviewQueueItem(id, isExample);
    refreshQueues();
  };

  const handleClearQueue = (isExample: boolean) => {
    reviewQueueService.clearQueue(isExample);
    storageService.clearReviewQueue(isExample);
    refreshQueues();
  };

  const handleSelectClassificationTile = (item: QueueItem) => {
    handleSetCurrentImage({
      file: null,
      name: item.imageMetadata.name,
      sizeBytes: item.imageMetadata.sizeBytes,
      width: item.imageMetadata.width,
      height: item.imageMetadata.height,
      dataUrl: item.imageMetadata.dataUrl,
    });
    setPredictionResult(item);
    setActiveTab('classification');
  };

  const handleTestConnection = async (url: string) => {
    return await predictionService.testEndpointConnection(url);
  };

  const handleSaveEndpointConfig = (newConfig: ModelEndpointConfig) => {
    setEndpointConfig(newConfig);
    storageService.saveModelEndpointConfig(newConfig);
    predictionService.updateConfig(classes, reviewThreshold, newConfig);
  };

  const handleSaveClasses = (newClasses: LandUseClass[]) => {
    setClasses(newClasses);
    storageService.saveClassTaxonomy(newClasses);
    predictionService.updateConfig(newClasses, reviewThreshold, endpointConfig);
  };

  const handleSaveThreshold = (newThreshold: number) => {
    setReviewThreshold(newThreshold);
    storageService.saveUserPreferences({ reviewThreshold: newThreshold });
    predictionService.updateConfig(classes, newThreshold, endpointConfig);
  };

  const handleImportEvaluationData = (data: EvaluationImportData) => {
    setImportedEvaluation(data);
    storageService.saveEvaluationResults(data);

    // Keep taxonomy and ordering synchronized if model provided specific classes
    if (data.classes && data.classes.length > 0) {
      const palette = ['#24845A', '#1779B8', '#D5A23D', '#102B46', '#8C7853', '#2E7D6F', '#7C8C56', '#64748B'];
      const updatedClasses: LandUseClass[] = data.classes.map((clsName, idx) => {
        const existing = classes.find((c) => c.name.toLowerCase() === clsName.toLowerCase());
        if (existing) {
          return { ...existing, name: clsName }; // Preserve exact model label and ordering
        }
        return {
          id: clsName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          name: clsName,
          description: `Imported model class '${clsName}'`,
          colorHex: palette[idx % palette.length],
          isCustom: true,
        };
      });
      setClasses(updatedClasses);
      storageService.saveClassTaxonomy(updatedClasses);
      predictionService.updateConfig(updatedClasses, reviewThreshold, endpointConfig);
    }
  };

  const handleClearEvaluationData = () => {
    setImportedEvaluation(null);
    storageService.clearEvaluationResults();
  };

  const totalFlaggedCount = useMemo(() => {
    return (
      realQueue.filter((i) => i.reviewStatus === 'flagged').length +
      exampleQueue.filter((i) => i.reviewStatus === 'flagged').length
    );
  }, [realQueue, exampleQueue]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        modelStatus={endpointConfig.status}
        isPracticeModel={Boolean(endpointConfig.metadata?.practiceMode)}
        onOpenModelModal={() => setIsModelModalOpen(true)}
        onOpenClassModal={() => setIsClassModalOpen(true)}
        reviewQueueCount={totalFlaggedCount}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            onNavigate={setActiveTab}
            classes={classes}
            modelStatus={endpointConfig.status}
            isPracticeModel={Boolean(endpointConfig.metadata?.practiceMode)}
            reviewThreshold={reviewThreshold}
            onOpenModelModal={() => setIsModelModalOpen(true)}
            onOpenClassModal={() => setIsClassModalOpen(true)}
            importedEvaluation={importedEvaluation}
          />
        )}

        {activeTab === 'classification' && (
          <ClassificationView
            predictionService={predictionService}
            classes={classes}
            reviewThreshold={reviewThreshold}
            endpointConfig={endpointConfig}
            currentImage={currentImage}
            setCurrentImage={handleSetCurrentImage}
            predictionResult={predictionResult}
            setPredictionResult={setPredictionResult}
            onOpenModelModal={() => setIsModelModalOpen(true)}
            onOpenClassModal={() => setIsClassModalOpen(true)}
            onAddToReviewQueue={handleAddToReviewQueue}
          />
        )}

        {activeTab === 'queue' && (
          <ReviewQueueView
            realQueue={realQueue}
            exampleQueue={exampleQueue}
            classes={classes}
            reviewThreshold={reviewThreshold}
            onUpdateStatus={handleUpdateQueueStatus}
            onRemoveItem={handleRemoveQueueItem}
            onClearQueue={handleClearQueue}
            onSelectClassificationTile={handleSelectClassificationTile}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationView
            classes={classes}
            importedData={importedEvaluation}
            onImportData={handleImportEvaluationData}
            onClearData={handleClearEvaluationData}
          />
        )}

        {activeTab === 'methodology' && <MethodologyView />}

        {activeTab === 'about' && <AboutView />}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#102B46]">TerraScope AI</span>
            <span aria-hidden="true">·</span>
            <span>AI Sansad Round 2 Academic AI Competition</span>
            <span aria-hidden="true">·</span>
            <span>Satellite Land-Use Tile Classification</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Prototype v1.0</span>
            <button
              onClick={() => setActiveTab('about')}
              className="hover:text-slate-600 transition-colors cursor-pointer"
            >
              Ethics & Limitations
            </button>
            <button
              onClick={() => setIsModelModalOpen(true)}
              className="hover:text-slate-600 transition-colors cursor-pointer"
            >
              Model Architecture
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthChange={(user) => {
          setCurrentUser(user);
          refreshQueues();
        }}
      />

      <ModelConnectionModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        config={endpointConfig}
        onSaveConfig={handleSaveEndpointConfig}
        onTestConnection={handleTestConnection}
        onConnectTFLite={handleConnectTFLite}
        onDisconnectModel={handleDisconnectModel}
      />

      <ClassManagerModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        classes={classes}
        onSaveClasses={handleSaveClasses}
        reviewThreshold={reviewThreshold}
        onSaveThreshold={handleSaveThreshold}
      />
    </div>
  );
}
