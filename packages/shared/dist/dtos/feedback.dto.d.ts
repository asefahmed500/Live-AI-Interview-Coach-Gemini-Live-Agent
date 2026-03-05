export interface FeedbackDto {
    sessionId: string;
    type: 'speech' | 'content' | 'confidence' | 'clarity';
    score: number;
    message: string;
    suggestions?: string[];
}
export interface FeedbackResponseDto {
    id: string;
    sessionId: string;
    type: string;
    score: number;
    message: string;
    suggestions: string[];
    createdAt: string;
}
//# sourceMappingURL=feedback.dto.d.ts.map