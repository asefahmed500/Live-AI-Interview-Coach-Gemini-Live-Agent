/**
 * Application-wide types
 */

// Interview modes
export type InterviewMode = 'technical' | 'behavioral' | 'mixed';

// Interview difficulty levels
export type InterviewDifficulty = 'junior' | 'mid' | 'senior' | 'lead';

// Session status
export type SessionStatus = 'idle' | 'active' | 'paused' | 'completed';

// Session state (includes more states for the interview flow)
export type SessionState = 'idle' | 'connecting' | 'connected' | 'starting' | 'active' | 'paused' | 'ending' | 'ended' | 'completed' | 'error';

// Message role
export type MessageRole = 'user' | 'assistant' | 'system';

// Connection state for WebSocket
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Transcript message
export interface TranscriptMessage {
  id?: string;
  sessionId?: string;
  role: MessageRole;
  content: string;
  timestamp: number | string;
  metadata?: {
    confidence?: number;
    feedbackType?: 'speech' | 'content' | 'confidence' | 'clarity';
    duration?: number;
  };
}

// AI response partial (for streaming responses)
export interface AIResponsePartial {
  content?: string;
  delta?: string;
  isFinal?: boolean;
  done?: boolean;
  sessionId?: string;
  sequenceNumber?: number;
  timestamp?: number;
}

// WebSocket message types
export interface StartSessionMessage {
  sessionId?: string;
  jobDescription: string;
  mode?: InterviewMode;
  difficulty?: InterviewDifficulty;
}

export interface AudioChunkMessage {
  sessionId: string;
  chunkData: string;
  sequenceNumber: number;
  timestamp: number;
}

export interface FrameAnalysisMessage {
  sessionId: string;
  frameData: string;
  frameNumber: number;
  timestamp: number;
  format?: string;
  width?: number;
  height?: number;
}

export interface InterruptMessage {
  sessionId: string;
  reason?: string;
  timestamp?: number;
}

export interface StopSessionMessage {
  sessionId: string;
  reason?: string;
  endTime?: number;
}

// WebSocket response types
export interface SessionStartedResponse {
  sessionId: string;
  startedAt: number;
}

export interface TranscriptPartialResponse {
  sessionId: string;
  text: string;
  timestamp: number;
}

export interface AIResponse {
  sessionId: string;
  content: string;
  isFinal?: boolean;
  role?: MessageRole;
  timestamp?: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
}

// UI state
export interface UIState {
  sidebarOpen: boolean;
  isDarkMode: boolean;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

// Interview session data
export interface InterviewSession {
  id: string;
  jobDescription: string;
  mode: InterviewMode;
  difficulty?: InterviewDifficulty;
  status: SessionStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  transcript: TranscriptMessage[];
}

// Confidence data
export interface ConfidenceData {
  score: number;
  trend: 'up' | 'down' | 'stable';
  history: number[];
  lastUpdated: number;
  feedback?: string;
}
