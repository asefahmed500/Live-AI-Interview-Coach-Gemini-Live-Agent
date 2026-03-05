'use client';

import { apiClient } from './api-client';
import { useAuthStore } from '@/store/use-auth-store';

export interface Session {
  id: string;
  userId: string;
  jobDescription: string;
  status: 'idle' | 'active' | 'paused' | 'completed';
  transcript: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    metadata?: {
      confidence?: number;
      feedbackType?: string;
      duration?: number;
    };
  }>;
  confidenceHistory: number[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SessionStatistics {
  total: number;
  active: number;
  completed: number;
  averageConfidence: number;
}

export interface CreateSessionDto {
  jobDescription: string;
  status?: 'idle' | 'active';
  initialMessage?: string;
}

export interface UpdateSessionDto {
  jobDescription?: string;
  status?: 'idle' | 'active' | 'paused' | 'completed';
}

export interface AddMessageDto {
  role: 'user' | 'assistant';
  content: string;
  confidence?: number;
  feedbackType?: string;
  duration?: number;
}

class SessionsApi {
  private getToken(): string | null {
    return useAuthStore.getState().token;
  }

  private getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async createSession(data: CreateSessionDto): Promise<Session> {
    const response = await apiClient.post<Session>('/sessions', data, {
      headers: this.getAuthHeaders(),
    });
    return response;
  }

  async getSessions(params?: {
    status?: string;
    search?: string;
    limit?: number;
    skip?: number;
    includeCompleted?: boolean;
  }): Promise<{ sessions: Session[]; total: number }> {
    const response = await apiClient.get<{ sessions: Session[]; total: number }>('/sessions', {
      params,
      headers: this.getAuthHeaders(),
    });
    return response;
  }

  async getActiveSessions(): Promise<Session[]> {
    const response = await apiClient.get<Session[]>('/sessions/active', {
      headers: this.getAuthHeaders(),
    });
    return response;
  }

  async getCompletedSessions(limit = 10): Promise<Session[]> {
    const response = await apiClient.get<Session[]>('/sessions/completed', {
      params: { limit },
      headers: this.getAuthHeaders(),
    });
    return response;
  }

  async getSession(sessionId: string): Promise<Session> {
    const response = await apiClient.get<Session>(`/sessions/${sessionId}`, {
      headers: this.getAuthHeaders(),
    });
    return response;
  }

  async updateSession(sessionId: string, data: UpdateSessionDto): Promise<Session> {
    const response = await apiClient.patch<Session>(`/sessions/${sessionId}`, data, {
      headers: this.getAuthHeaders(),
    });
    return response;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/sessions/${sessionId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async addMessage(sessionId: string, data: AddMessageDto): Promise<Session> {
    const response = await apiClient.post<Session>(`/sessions/${sessionId}/messages`, data, {
      headers: this.getAuthHeaders(),
    });
    return response;
  }

  async getStatistics(): Promise<SessionStatistics> {
    const response = await apiClient.get<SessionStatistics>('/sessions/statistics', {
      headers: this.getAuthHeaders(),
    });
    return response;
  }
}

export const sessionsApi = new SessionsApi();
