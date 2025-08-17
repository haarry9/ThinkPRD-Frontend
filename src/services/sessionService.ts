import { api } from '@/lib/api';
import type {
  SessionCreateRequest,
  SessionCreateResponse,
  SessionSaveResponse,
  SessionVersionsResponse,
  SessionVersionResponse,
  MessageRequest,
  MessageResponse,
} from '@/types/prd';

/**
 * Session management service for PRD Builder
 */
export class SessionService {
  /**
   * Create a new PRD session with an initial idea
   */
  async createSession(userId: string, idea: string): Promise<SessionCreateResponse> {
    const request: SessionCreateRequest = {
      user_id: userId,
      idea,
    };

    return await api.post<SessionCreateResponse>('/sessions', request);
  }

  /**
   * Send a message to continue building the PRD
   */
  async sendMessage(sessionId: string, message: string): Promise<MessageResponse> {
    const request: MessageRequest = { message };
    return await api.post<MessageResponse>(`/sessions/${sessionId}/message`, request);
  }

  /**
   * Send a message with file attachments for RAG
   */
  async sendMessageWithFiles(
    sessionId: string,
    message: string,
    files: File[]
  ): Promise<MessageResponse> {
    const formData = new FormData();
    formData.append('message', message);
    
    files.forEach(file => {
      formData.append('files', file);
    });

    return await api.postFormData<MessageResponse>(
      `/sessions/${sessionId}/message-with-files`,
      formData
    );
  }

  /**
   * Save the current session state to the database
   */
  async saveSession(sessionId: string): Promise<SessionSaveResponse> {
    return await api.post<SessionSaveResponse>(`/sessions/${sessionId}/save`);
  }

  /**
   * Export the PRD (triggers export process)
   */
  async exportPRD(sessionId: string): Promise<MessageResponse> {
    return await api.post<MessageResponse>(`/sessions/${sessionId}/export`);
  }

  /**
   * Refine the current PRD
   */
  async refinePRD(sessionId: string): Promise<MessageResponse> {
    return await api.post<MessageResponse>(`/sessions/${sessionId}/refine`);
  }

  /**
   * List all versions for a session
   */
  async getVersions(sessionId: string): Promise<SessionVersionsResponse> {
    return await api.get<SessionVersionsResponse>(`/sessions/${sessionId}/versions`);
  }

  /**
   * Get a specific version of a session
   */
  async getVersion(sessionId: string, versionId: string): Promise<SessionVersionResponse> {
    return await api.get<SessionVersionResponse>(`/sessions/${sessionId}/versions/${versionId}`);
  }

  /**
   * Create an EventSource for streaming updates
   */
  createEventSource(sessionId: string, message?: string): EventSource {
    const params: Record<string, string> = {};
    if (message) {
      params.message = message;
    }
    
    return api.createEventSource(`/sessions/${sessionId}/stream`, params);
  }
}

export const sessionService = new SessionService();