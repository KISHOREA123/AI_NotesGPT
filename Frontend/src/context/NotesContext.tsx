import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Note, NoteColor } from '@/types';
import { notesService } from '@/services/notesService';
import { useAuth } from './AuthContext';

interface NotesContextType {
  notes: Note[];
  deletedNotes: Note[];
  isLoading: boolean;
  createNote: (title: string, content: string, color?: NoteColor) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  permanentlyDeleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  refreshNotes: () => Promise<void>;
  searchNotes: (query: string) => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [deletedNotes, setDeletedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // Load notes when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshNotes();
      loadDeletedNotes();
    } else {
      // Clear notes when user logs out
      setNotes([]);
      setDeletedNotes([]);
    }
  }, [isAuthenticated]);

  const refreshNotes = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const response = await notesService.getNotes({
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      setNotes(response.notes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadDeletedNotes = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const deleted = await notesService.getDeletedNotes();
      setDeletedNotes(deleted);
    } catch (error) {
      console.error('Failed to load deleted notes:', error);
    }
  }, [isAuthenticated]);

  const createNote = useCallback(async (title: string, content: string, color: NoteColor = 'default') => {
    setIsLoading(true);
    try {
      const newNote = await notesService.createNote({ title, content, color });
      setNotes((prev) => [newNote, ...prev]);
      return newNote;
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    setIsLoading(true);
    try {
      const updatedNote = await notesService.updateNote(id, updates);
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? updatedNote : note))
      );
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await notesService.deleteNote(id);
      
      // Move note from notes to deletedNotes
      const noteToDelete = notes.find(note => note.id === id);
      if (noteToDelete) {
        const deletedNote = { ...noteToDelete, isDeleted: true, deletedAt: new Date().toISOString() };
        setNotes((prev) => prev.filter((note) => note.id !== id));
        setDeletedNotes((prev) => [deletedNote, ...prev]);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [notes]);

  const restoreNote = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const restoredNote = await notesService.restoreNote(id);
      
      // Move note from deletedNotes to notes
      setDeletedNotes((prev) => prev.filter((note) => note.id !== id));
      setNotes((prev) => [restoredNote, ...prev]);
    } catch (error) {
      console.error('Failed to restore note:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const permanentlyDeleteNote = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await notesService.permanentlyDeleteNote(id);
      setDeletedNotes((prev) => prev.filter((note) => note.id !== id));
    } catch (error) {
      console.error('Failed to permanently delete note:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const togglePin = useCallback(async (id: string) => {
    try {
      const updatedNote = await notesService.togglePin(id);
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? updatedNote : note))
      );
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      throw error;
    }
  }, []);

  const searchNotes = useCallback(async (query: string) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      if (query.trim()) {
        const response = await notesService.searchNotes(query, {
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        });
        setNotes(response.notes);
      } else {
        // If query is empty, load all notes
        await refreshNotes();
      }
    } catch (error) {
      console.error('Failed to search notes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshNotes]);

  return (
    <NotesContext.Provider
      value={{
        notes,
        deletedNotes,
        isLoading,
        createNote,
        updateNote,
        deleteNote,
        restoreNote,
        permanentlyDeleteNote,
        togglePin,
        refreshNotes,
        searchNotes,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}
