export interface Session {
    id: string;
    userId: string;
    title: string;
    status: 'idle' | 'active' | 'paused' | 'completed';
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface Message {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}
//# sourceMappingURL=session.types.d.ts.map