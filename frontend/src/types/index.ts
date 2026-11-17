export interface HTRLine {
  line_number: number;
  text: string;
  bounding_box?: [number, number, number, number];
  confidence?: number;
  line_image_data?: string;
}

export interface HTRResponse {
  transcription: string;
  lines: HTRLine[];
  num_lines: number;
  model_name: string;
  benchmark_cer: number;
  benchmark_wer: number;
  test_samples: number;
  dataset: string;
  is_demo: boolean;
  preprocessing_info?: {
    width: number;
    height: number;
    skew_angle: number;
    otsu_threshold: number;
    ink_density: number;
    lines_detected: number;
  };
}



export interface SignatureVerificationResponse {
  result: 'genuine' | 'forged' | 'model_not_connected' | string;
  distance: number;
  threshold: number;
  similarity: number;
  model_connected: boolean;
  status: string;
  message?: string;
  dataset: string;
  model_architecture: string;
  is_demo: boolean;
}

export interface PersonalityTrait {
  trait: string;
  score: number;
  interpretation?: string;
  derived_from?: string;
}

export interface PersonalityFeatures {
  slant: string;
  letter_size: string;
  spacing: string;
  baseline: string;
  consistency: string;
  pen_pressure?: string;
}

export interface PersonalityResponse {
  features: PersonalityFeatures;
  experimental_associations: PersonalityTrait[];
  disclaimer: string;
  raw_metrics?: {
    slant_angle_degrees: number;
    estimated_char_height_px: number;
    inter_word_gap_ratio: number;
    baseline_slope_deg: number;
    baseline_variance: number;
    stroke_thickness_px: number;
    consistency_score: number;
  };
  is_demo: boolean;
}

export interface SystemStatus {
  status: string;
  demo_mode_allowed: boolean;
  modules: {
    htr: {
      name: string;
      connected: boolean;
      model: string;
      dataset: string;
      metrics: {
        test_samples: number;
        cer: number;
        wer: number;
      };
      status_label: string;
    };
    signature_verification: {
      name: string;
      connected: boolean;
      model: string;
      dataset: string;
      metrics: {
        equal_error_rate_eer?: number;
        accuracy?: number;
      };
      status_label: string;
    };
    personality_analysis: {
      name: string;
      connected: boolean;
      model: string;
      dataset: string;
      metrics: {
        scientific_validation: string;
      };
      status_label: string;
    };
  };
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  module: 'htr' | 'signature' | 'personality' | 'unified';
  title: string;
  status: 'success' | 'warning' | 'error' | 'disconnected';
  summary: string;
  data: any;
  thumbnailUrl?: string;
}
