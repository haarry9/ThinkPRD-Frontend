import { api } from '@/lib/api';
import type {
  SessionCreateRequest,
  SessionCreateResponse,
  SessionSaveResponse,
  SessionVersionsResponse,
  SessionVersionResponse,
  MessageRequest,
  MessageResponse,
  AskRequest,
  AskResponse,
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
   * Ask a question about the PRD (ask mode)
   */
  async askQuestion(sessionId: string, message: string): Promise<AskResponse> {
    const request: AskRequest = { message };
    return await api.post<AskResponse>(`/sessions/${sessionId}/ask`, request);
  }

  /**
   * Upload files for RAG context (without message)
   */
  async uploadFiles(sessionId: string, files: File[]): Promise<MessageResponse> {
    // Validate files
    if (!files || files.length === 0) {
      throw new Error('No files provided for upload');
    }

    files.forEach((file, index) => {
      if (!(file instanceof File)) {
        throw new Error(`File at index ${index} is not a valid File object`);
      }
      if (file.size === 0) {
        throw new Error(`File at index ${index} (${file.name}) is empty`);
      }
    });

    const formData = new FormData();
    
    // Add each file to the FormData with the 'files' field name
    files.forEach((file, index) => {
      formData.append('files', file);
      console.log(`Appending file ${index}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
    });

    // Debug: Log FormData contents
    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
    }

    // Debug: Log the endpoint being called
    console.log('Calling endpoint:', `/sessions/${sessionId}/message-with-files`);

    return await api.postFormData<MessageResponse>(
      `/sessions/${sessionId}/message-with-files`,
      formData
    );
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


}

export const sessionService = new SessionService();