/**
 * Configuration options for GeminiService
 */
export interface GeminiServiceOptions {
  apiKey: string;
  model?: string;
  defaultTemperature?: number;
  defaultTopP?: number;
  defaultTopK?: number;
  defaultMaxOutputTokens?: number;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  timeout?: number;
}

/**
 * Options for creating a session
 */
export interface CreateSessionOptions {
  jobDescription: string;
  mode?: 'technical' | 'behavioral' | 'mixed';
  difficulty?: 'junior' | 'mid' | 'senior' | 'lead';
  personality?: 'friendly' | 'aggressive' | 'vc';
  model?: string;
  temperature?: number;
  systemInstruction?: string;
}

/**
 * Options for streaming audio
 */
export interface StreamAudioOptions {
  sessionId: string;
  audioData: ArrayBuffer;
  mimeType?: string;
  endOfUtterance?: boolean;
}

/**
 * Prompt building options
 */
export interface PromptBuildOptions {
  jobDescription: string;
  mode?: 'technical' | 'behavioral' | 'mixed';
  difficulty?: 'junior' | 'mid' | 'senior' | 'lead';
  conversationHistory?: Array<{ role: string; content: string }>;
  currentQuestion?: string;
}
