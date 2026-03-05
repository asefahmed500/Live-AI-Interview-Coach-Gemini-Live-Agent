export declare const API_ROUTES: {
    readonly AUTH: {
        readonly LOGIN: "/auth/login";
        readonly REGISTER: "/auth/register";
        readonly REFRESH: "/auth/refresh";
        readonly LOGOUT: "/auth/logout";
    };
    readonly SESSIONS: {
        readonly LIST: "/sessions";
        readonly CREATE: "/sessions";
        readonly GET: "/sessions/:id";
        readonly UPDATE: "/sessions/:id";
        readonly DELETE: "/sessions/:id";
    };
    readonly FEEDBACK: {
        readonly LIST: "/feedback";
        readonly GET: "/feedback/:id";
    };
};
export declare const WS_EVENTS: {
    readonly JOIN_SESSION: "join_session";
    readonly LEAVE_SESSION: "leave_session";
    readonly START_SESSION: "start_session";
    readonly PAUSE_SESSION: "pause_session";
    readonly RESUME_SESSION: "resume_session";
    readonly END_SESSION: "end_session";
    readonly SEND_MESSAGE: "send_message";
    readonly SESSION_STARTED: "session_started";
    readonly SESSION_PAUSED: "session_paused";
    readonly SESSION_RESUMED: "session_resumed";
    readonly SESSION_ENDED: "session_ended";
    readonly MESSAGE_RECEIVED: "message_received";
    readonly FEEDBACK_REALTIME: "feedback_realtime";
    readonly ERROR: "error";
};
export declare const SESSION_STATUS: {
    readonly IDLE: "idle";
    readonly ACTIVE: "active";
    readonly PAUSED: "paused";
    readonly COMPLETED: "completed";
};
export declare const FEEDBACK_TYPE: {
    readonly SPEECH: "speech";
    readonly CONTENT: "content";
    readonly CONFIDENCE: "confidence";
    readonly CLARITY: "clarity";
};
//# sourceMappingURL=index.d.ts.map