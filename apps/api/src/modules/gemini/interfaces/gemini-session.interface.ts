/**
 * Represents an active Gemini Live API session
 */
export interface GeminiSession {
  sessionId: string;
  jobDescription: string;
  model: string;
  createdAt: Date;
  lastActivityAt: Date;
  status: 'initializing' | 'active' | 'interrupted' | 'closed';
  abortController: AbortController;
  messageCount: number;
  totalTokens: number;
  totalLatency: number;
}

/**
 * Streaming response metadata
 */
export interface StreamMetadata {
  sessionId: string;
  startTime: number;
  endTime?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latency?: number;
  interrupted: boolean;
  error?: string;
}

/**
 * Audio chunk for streaming
 */
export interface AudioChunk {
  data: ArrayBuffer;
  sequenceNumber: number;
  timestamp: number;
  mimeType?: string;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
}

/**
 * Interview mode configuration
 */
export interface InterviewModeConfig {
  mode: 'technical' | 'behavioral' | 'mixed';
  difficulty?: 'junior' | 'mid' | 'senior' | 'lead';
  focusAreas?: string[];
}

/**
 * API response from Gemini
 */
export interface GeminiResponse {
  text: string;
  finishReason?: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER';
  candidates?: Array<{
    content: {
      parts: Array<{
        text?: string;
        executableCode?: {
          code: string;
          language: string;
        };
      }>;
    };
    finishReason: string;
    index: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}
