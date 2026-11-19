export interface RecentItem {
  type: "handwriting" | "signature";
  id: number;
  title: string;
  subtitle: string;
  created_at: string;
  thumbnail: string;
}

export interface Stats {
  handwriting_analyses: number;
  signature_comparisons: number;
  genuine_detected: number;
  forged_detected: number;
  recent: RecentItem[];
}

export interface ModelStatus {
  model_loaded: boolean;
  checkpoint_found: boolean;
  config_found: boolean;
  device: string;
  config: {
    img_height: number; img_width: number; embedding_dim: number;
    contrastive_margin: number; decision_threshold: number;
    threshold_selection?: string;
  } | null;
  error: string | null;
  setup_instructions: string[];
}

export interface FeatureRow {
  key: string; name: string;
  value: number | null;
  unit: string; explanation: string; formula: string;
}

export interface Features {
  ink_density: number;
  writing_height: number;
  writing_width: number;
  stroke_width: number;
  word_spaces: number;
  average_gap: number;
  baseline_angle: number | null;
  handwriting_lines: number;
}

export interface Charts {
  vertical_projection: { x: number; v: number }[];
  horizontal_projection: { x: number; v: number }[];
  gap_widths: number[];
  line_bands: { top: number; bottom: number; peak: number }[];
  stroke_distance_histogram: { bin: string; count: number }[];
}

export interface HandwritingResult {
  analysis_id: number;
  created_at: string;
  filename: string;
  width: number;
  height: number;
  processing_time_ms: number;
  warnings?: string[];
  preprocessing: {
    otsu_threshold: number;
    horizontal_kernel_length: number;
    ruling_line_pixels_removed: number;
    min_component_area: number;
    components_total: number;
    components_removed: number;
  };
  stages: Record<"original" | "grayscale" | "binary" | "processed", string>;
  features: Features;
  feature_rows: FeatureRow[];
  charts: Charts;
  original_image_url: string;
  processed_image_url: string;
}

export interface VerifyResult {
  verification_id: number;
  created_at: string;
  result: "genuine_pair" | "different_pair";
  label: string;
  distance: number;
  threshold: number;
  predicted_same: boolean;
  embedding_dim: number;
  processing_time_ms: number;
  image_a_url: string;
  image_b_url: string;
  disclaimer: string;
}

export interface EvalResults {
  accuracy: number; precision: number; recall: number; f1: number;
  far: number; frr: number; eer: number; roc_auc: number | null;
  threshold: number; threshold_selection: string;
  val_accuracy_at_threshold?: number;
  confusion_matrix: { tn: number; fp: number; fn: number; tp: number };
  roc_curve: { fpr: number[]; tpr: number[] };
  loss_curves: { train: number[]; validation: number[] };
  test_pairs: number;
  splits?: { train_writers: number; val_writers: number; test_writers: number };
  epochs?: number; device?: string; trained_at?: string;
}

export interface HistoryItem {
  type: "handwriting" | "signature";
  id: number;
  created_at: string;
  title: string;
  thumbnail: string;
  summary: Record<string, any>;
}

export interface FeaturesHistoryEntry {
  id: number;
  created_at: string;
  features: Features;
}


export interface HTRResult {
  text: string;
  model_id: string;
  device: string;
  processing_time_ms: number;
  image_width: number;
  image_height: number;
  filename: string;
  disclaimer: string;
  line_count?: number;
  lines?: string[];
  line_images?: string[];
  fallback?: boolean;
}



export interface HTRStatus {
  available: boolean;
  dependency_installed?: boolean;
  model_id: string;
  loaded: boolean;
  device: string;
  error: string | null;
  load_on_first_request: boolean;
}
