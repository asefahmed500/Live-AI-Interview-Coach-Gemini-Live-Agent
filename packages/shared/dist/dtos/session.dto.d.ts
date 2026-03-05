export interface CreateSessionDto {
    title: string;
}
export interface UpdateSessionDto {
    title?: string;
    status?: 'idle' | 'active' | 'paused' | 'completed';
}
export interface SessionResponseDto {
    id: string;
    userId: string;
    title: string;
    status: 'idle' | 'active' | 'paused' | 'completed';
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=session.dto.d.ts.map