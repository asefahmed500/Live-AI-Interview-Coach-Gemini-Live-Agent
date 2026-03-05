/**
 * WebSocket Events Constants
 * Defines all event types used in the live interview WebSocket communication
 */

// Client -> Server Events
export const CLIENT_EVENTS = {
  START_SESSION: 'start_session',
  AUDIO_CHUNK: 'audio_chunk',
  FRAME_ANALYSIS: 'frame_analysis',
  INTERRUPT: 'interrupt',
  STOP_SESSION: 'stop_session',
} as const;

// Server -> Client Events
export const SERVER_EVENTS = {
  CONNECTION_ESTABLISHED: 'connection_established',
  SERVER_READY: 'server_ready',
  SESSION_STARTED: 'session_started',
  AUDIO_RECEIVED: 'audio_received',
  FRAME_PROCESSED: 'frame_processed',
  CONFIDENCE_UPDATE: 'confidence_update',
  TRANSCRIPT_PARTIAL: 'transcript_partial',
  AI_RESPONSE: 'ai_response',
  AI_RESPONSE_PARTIAL: 'ai_response_partial',
  FEEDBACK_GENERATED: 'feedback_generated',
  INTERRUPT_ACK: 'interrupt_acknowledged',
  SESSION_ENDED: 'session_ended',
  ERROR: 'error',
} as const;

// Combined events object
export const WebSocketEvents = {
  ...CLIENT_EVENTS,
  ...SERVER_EVENTS,
} as const;

// Event types for type safety
export type ClientEventType = keyof typeof CLIENT_EVENTS;
export type ServerEventType = keyof typeof SERVER_EVENTS;
export type WebSocketEventType = ClientEventType | ServerEventType;
