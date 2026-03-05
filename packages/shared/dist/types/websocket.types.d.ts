export type WebSocketEventType = 'session:start' | 'session:pause' | 'session:resume' | 'session:end' | 'message:incoming' | 'message:outgoing' | 'feedback:realtime' | 'error';
export interface WebSocketMessage {
    type: WebSocketEventType;
    payload: unknown;
    sessionId?: string;
    timestamp: Date;
}
export interface FeedbackPayload {
    type: 'speech' | 'content' | 'confidence' | 'clarity';
    score: number;
    message: string;
    suggestions?: string[];
}
//# sourceMappingURL=websocket.types.d.ts.map