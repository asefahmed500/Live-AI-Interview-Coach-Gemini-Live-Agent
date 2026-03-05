"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEEDBACK_TYPE = exports.SESSION_STATUS = exports.WS_EVENTS = exports.API_ROUTES = void 0;
exports.API_ROUTES = {
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
};
exports.WS_EVENTS = {
    JOIN_SESSION: 'join_session',
    LEAVE_SESSION: 'leave_session',
    START_SESSION: 'start_session',
    PAUSE_SESSION: 'pause_session',
    RESUME_SESSION: 'resume_session',
    END_SESSION: 'end_session',
    SEND_MESSAGE: 'send_message',
    SESSION_STARTED: 'session_started',
    SESSION_PAUSED: 'session_paused',
    SESSION_RESUMED: 'session_resumed',
    SESSION_ENDED: 'session_ended',
    MESSAGE_RECEIVED: 'message_received',
    FEEDBACK_REALTIME: 'feedback_realtime',
    ERROR: 'error',
};
exports.SESSION_STATUS = {
    IDLE: 'idle',
    ACTIVE: 'active',
    PAUSED: 'paused',
    COMPLETED: 'completed',
};
exports.FEEDBACK_TYPE = {
    SPEECH: 'speech',
    CONTENT: 'content',
    CONFIDENCE: 'confidence',
    CLARITY: 'clarity',
};
//# sourceMappingURL=index.js.map