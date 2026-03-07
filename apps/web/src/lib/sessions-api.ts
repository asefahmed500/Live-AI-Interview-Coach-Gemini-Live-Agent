class SessionsApi {
  private getAuthHeaders() {
    // Better Auth uses session cookies, so we don't need to send Bearer tokens
    // The browser will automatically include the session cookie
    return {
      'Content-Type': 'application/json',
    };
  }

  async createSession(data: any): Promise<any> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sessions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create session');
    return response.json();
  }

  async getSessions(params?: any): Promise<any> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sessions?${queryString}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to get sessions');
    return response.json();
  }

  async getActiveSessions(): Promise<any> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sessions/active`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to get active sessions');
    return response.json();
  }

  async getCompletedSessions(limit = 10): Promise<any> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sessions/completed?limit=${limit}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to get completed sessions');
    return response.json();
  }

  async getSession(sessionId: string): Promise<any> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sessions/${sessionId}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to get session');
    return response.json();
  }

  async updateSession(sessionId: string, data: any): Promise<any> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update session');
    return response.json();
  }

  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete session');
  }

  async addMessage(sessionId: string, data: any): Promise<any> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add message');
    return response.json();
  }

  async getStatistics(): Promise<any> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sessions/statistics`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to get statistics');
    return response.json();
  }
}

export const sessionsApi = new SessionsApi();

// Re-export types for convenience
export type Session = any;
export type SessionStatistics = any;
export type CreateSessionDto = any;
export type UpdateSessionDto = any;
export type AddMessageDto = any;
