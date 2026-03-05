// API Constants
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  SESSIONS: {
    LIST: '/sessions',
    CREATE: '/sessions',
    GET: '/sessions/:id',
    UPDATE: '/sessions/:id',
    DELETE: '/sessions/:id',
  },
  FEEDBACK: {
    LIST: '/feedback',
    GET: '/feedback/:id',
  },
} as const;

// WebSocket Events
export const WS_EVENTS = {
  // Client -> Server
  JOIN_SESSION: 'join_session',
  LEAVE_SESSION: 'leave_session',
  START_SESSION: 'start_session',
  PAUSE_SESSION: 'pause_session',
  RESUME_SESSION: 'resume_session',
  END_SESSION: 'end_session',
  SEND_MESSAGE: 'send_message',

  // Server -> Client
  SESSION_STARTED: 'session_started',
  SESSION_PAUSED: 'session_paused',
  SESSION_RESUMED: 'session_resumed',
  SESSION_ENDED: 'session_ended',
  MESSAGE_RECEIVED: 'message_received',
  FEEDBACK_REALTIME: 'feedback_realtime',
  ERROR: 'error',
} as const;

// Session Status
export const SESSION_STATUS = {
  IDLE: 'idle',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
} as const;

// Feedback Types
export const FEEDBACK_TYPE = {
  SPEECH: 'speech',
  CONTENT: 'content',
  CONFIDENCE: 'confidence',
  CLARITY: 'clarity',
} as const;
