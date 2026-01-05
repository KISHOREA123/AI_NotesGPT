import { apiClient, ApiResponse, PaginatedResponse } from '@/lib/api';
import { Note, NoteColor } from '@/types';

// Notes request/response types
interface CreateNoteRequest {
  title: string;
  content: string;
  color?: NoteColor;
}

interface UpdateNoteRequest {
  title?: string;
  content?: string;
  color?: NoteColor;
  isPinned?: boolean;
}

interface NotesQuery {
  page?: number;
  limit?: number;
  search?: string;
  color?: NoteColor;
  pinned?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

interface NotesResponse {
  notes: Note[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class NotesService {
  /**
   * Get user notes with pagination and filtering
   */
  async getNotes(query: NotesQuery = {}): Promise<NotesResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      // Add query parameters
      if (query.page) searchParams.append('page', query.page.toString());
      if (query.limit) searchParams.append('limit', query.limit.toString());
      if (query.search) searchParams.append('search', query.search);
      if (query.color) searchParams.append('color', query.color);
      if (query.pinned !== undefined) searchParams.append('pinned', query.pinned.toString());
      if (query.sortBy) searchParams.append('sortBy', query.sortBy);
      if (query.sortOrder) searchParams.append('sortOrder', query.sortOrder);

      const queryString = searchParams.toString();
      const endpoint = `/notes${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get<NotesResponse>(endpoint);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to fetch notes');
    } catch (error) {
      console.error('Get notes error:', error);
      throw error;
    }
  }

  /**
   * Get a specific note by ID
   */
  async getNote(id: string): Promise<Note> {
    try {
      const response = await apiClient.get<Note>(`/notes/${id}`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to fetch note');
    } catch (error) {
      console.error('Get note error:', error);
      throw error;
    }
  }

  /**
   * Create a new note
   */
  async createNote(data: CreateNoteRequest): Promise<Note> {
    try {
      const response = await apiClient.post<Note>('/notes', data);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to create note');
    } catch (error) {
      console.error('Create note error:', error);
      throw error;
    }
  }

  /**
   * Update an existing note
   */
  async updateNote(id: string, data: UpdateNoteRequest): Promise<Note> {
    try {
      const response = await apiClient.put<Note>(`/notes/${id}`, data);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to update note');
    } catch (error) {
      console.error('Update note error:', error);
      throw error;
    }
  }

  /**
   * Soft delete a note
   */
  async deleteNote(id: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/notes/${id}`);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete note');
      }
    } catch (error) {
      console.error('Delete note error:', error);
      throw error;
    }
  }

  /**
   * Permanently delete a note
   */
  async permanentlyDeleteNote(id: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/notes/${id}/permanent`);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to permanently delete note');
      }
    } catch (error) {
      console.error('Permanent delete note error:', error);
      throw error;
    }
  }

  /**
   * Restore a deleted note
   */
  async restoreNote(id: string): Promise<Note> {
    try {
      const response = await apiClient.post<Note>(`/notes/${id}/restore`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to restore note');
    } catch (error) {
      console.error('Restore note error:', error);
      throw error;
    }
  }

  /**
   * Toggle note pin status
   */
  async togglePin(id: string): Promise<Note> {
    try {
      const response = await apiClient.patch<Note>(`/notes/${id}/pin`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to toggle pin');
    } catch (error) {
      console.error('Toggle pin error:', error);
      throw error;
    }
  }

  /**
   * Get deleted notes (recycle bin)
   */
  async getDeletedNotes(): Promise<Note[]> {
    try {
      const response = await apiClient.get<Note[]>('/notes/deleted');
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to fetch deleted notes');
    } catch (error) {
      console.error('Get deleted notes error:', error);
      throw error;
    }
  }

  /**
   * Search notes
   */
  async searchNotes(query: string, options: Omit<NotesQuery, 'search'> = {}): Promise<NotesResponse> {
    return this.getNotes({ ...options, search: query });
  }
}

// Export singleton instance
export const notesService = new NotesService();