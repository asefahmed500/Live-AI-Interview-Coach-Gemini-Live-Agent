/**
 * WebSocket message types
 */
export type WebSocketEventType =
  | 'connection_established'
  | 'server_ready'
  | 'session_started'
  | 'audio_received'
  | 'frame_processed'
  | 'confidence_update'
  | 'transcript_partial'
  | 'ai_response'
  | 'ai_response_partial'
  | 'feedback_generated'
  | 'interrupt_acknowledged'
  | 'session_ended'
  | 'error';

export type ClientWebSocketEventType =
  | 'start_session'
  | 'audio_chunk'
  | 'frame_analysis'
  | 'interrupt'
  | 'stop_session';

/**
 * WebSocket message interfaces
 */
export interface StartSessionMessage {
  jobDescription: string;
  mode?: 'technical' | 'behavioral' | 'mixed';
  difficulty?: 'junior' | 'mid' | 'senior' | 'lead';
  initialMessage?: string;
  sessionId?: string;
}

export interface AudioChunkMessage {
  sessionId: string;
  chunkData: string; // base64 encoded
  sequenceNumber: number;
  timestamp?: number;
  codec?: 'pcm16' | 'opus' | 'aac' | 'mp3';
}

export interface FrameAnalysisMessage {
  sessionId: string;
  frameData: string; // base64 encoded
  timestamp: number;
  frameNumber: number;
  format?: 'jpeg' | 'png' | 'webp';
  width?: number;
  height?: number;
  faceDetected?: boolean;
  faceData?: {
    confidence: number;
    emotion: string;
    attention: number;
  };
  engagement?: 'high' | 'medium' | 'low';
  detectedObjects?: string[];
}

export interface InterruptMessage {
  sessionId: string;
  reason: 'user_stopped' | 'technical_issue' | 'timeout' | 'quality_issue';
  message?: string;
  timestamp?: number;
  errorCode?: string;
}

export interface StopSessionMessage {
  sessionId: string;
  reason: 'user_completed' | 'user_aborted' | 'max_duration' | 'inactivity';
  message?: string;
  saveTranscript?: boolean;
  generateReport?: boolean;
}

/**
 * Server response interfaces
 */
export interface SessionStartedResponse {
  sessionId: string;
  message: string;
  mode: string;
  difficulty?: string;
  timestamp: string;
}

export interface TranscriptPartialResponse {
  sessionId: string;
  text: string;
  done: boolean;
  metadata?: {
    startTime: number;
    endTime: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    latency?: number;
  };
}

export interface AIResponse {
  sessionId: string;
  role: string;
  content: string;
  isFinal?: boolean;
  metadata?: any;
  timestamp: string;
}

export interface AIResponsePartial {
  sessionId: string;
  content: string;
  delta?: string; // Incremental text chunk
  isFinal?: boolean;
  sequenceNumber?: number;
  timestamp: string;
}

export interface ConfidenceUpdateResponse {
  sessionId: string;
  score: number;
  breakdown: {
    speechClarity: number;
    eyeContact: number;
    posture: number;
    fillerWords: number;
  };
  suggestions: string[];
  timestamp: string;
}

/**
 * Legacy frame-based confidence update (from frame analysis)
 */
export interface FrameAnalysisConfidenceResponse {
  sessionId: string;
  confidence: number;
  breakdown: {
    eyeContact: number;
    posture: number;
    engagement: number;
  };
  suggestions: string[];
  frameNumber: number;
  timestamp: string;
}

export interface ErrorResponse {
  sessionId?: string;
  message: string;
  code: string;
  timestamp: string;
}

/**
 * Connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Session state
 */
export type SessionState = 'idle' | 'starting' | 'active' | 'paused' | 'ended' | 'error';

/**
 * Message types for transcript
 */
export interface TranscriptMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isPartial?: boolean;
}

/**
 * Confidence score data
 */
export interface ConfidenceData {
  score: number;
  trend: 'up' | 'down' | 'stable';
  history: number[];
  lastUpdated: number;
}
