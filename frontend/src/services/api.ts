import {
  HTRResponse,
  SignatureVerificationResponse,
  PersonalityResponse,
  SystemStatus
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiService {
  /**
   * Handwritten Text Recognition
   */
  static async predictHTR(imageFile: File, demoMode: boolean = false): Promise<HTRResponse> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('demo_mode', String(demoMode));

    const response = await fetch(`${API_BASE_URL}/api/htr/predict`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to process HTR request' }));
      throw new Error(err.detail || `Server returned ${response.status}`);
    }

    return response.json();
  }

  /**
   * Signature Verification (Requires 2 images)
   */
  static async verifySignature(
    signature1File: File,
    signature2File: File,
    demoMode: boolean = false
  ): Promise<SignatureVerificationResponse> {
    const formData = new FormData();
    formData.append('signature1', signature1File);
    formData.append('signature2', signature2File);
    formData.append('demo_mode', String(demoMode));

    const response = await fetch(`${API_BASE_URL}/api/signature/verify`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Signature verification failed' }));
      throw new Error(err.detail || `Server returned ${response.status}`);
    }

    return response.json();
  }

  /**
   * Handwriting Personality Analysis
   */
  static async analyzePersonality(imageFile: File, demoMode: boolean = false): Promise<PersonalityResponse> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('demo_mode', String(demoMode));

    const response = await fetch(`${API_BASE_URL}/api/personality/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to analyze handwriting' }));
      throw new Error(err.detail || `Server returned ${response.status}`);
    }

    return response.json();
  }

  /**
   * System health and module status
   */
  static async getSystemStatus(): Promise<SystemStatus> {
    const response = await fetch(`${API_BASE_URL}/api/system/status`);
    if (!response.ok) {
      throw new Error('Backend server is not reachable');
    }
    return response.json();
  }
}
