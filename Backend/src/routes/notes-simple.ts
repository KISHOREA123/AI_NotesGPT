import { Router, Request, Response } from 'express';
import { authenticateToken, requireEmailVerification } from '@/middleware/auth-simple';
import { db } from '@/services/database';
import { logger } from '@/utils/logger';
import { DatabaseNote, Note, mapDatabaseNoteToNote, User } from '@/types';

const router = Router();

// Extend Request interface for authenticated routes
interface AuthenticatedRequest extends Request {
  user: User;
}

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

/**
 * Get all notes for the authenticated user
 * GET /api/notes
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  try {
    const supabase = db.getClient();
    
    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error(`Failed to fetch notes for user ${user.id}:`, error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch notes',
        },
      });
    }

    // Format notes for response
    const formattedNotes = (notes || []).map((note: DatabaseNote) => mapDatabaseNoteToNote(note));

    logger.debug(`Fetched ${formattedNotes.length} notes for user ${user.email}`);

    res.json({
      success: true,
      data: {
        notes: formattedNotes,
        pagination: {
          page: 1,
          limit: formattedNotes.length,
          total: formattedNotes.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * Get deleted notes for the authenticated user
 * GET /api/notes/deleted
 */
router.get('/deleted', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  
  try {
    const supabase = db.getClient();
    
    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });

    if (error) {
      logger.error(`Failed to fetch deleted notes for user ${user.id}:`, error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch deleted notes',
        },
      });
    }

    // Format notes for response
    const formattedNotes = (notes || []).map((note: DatabaseNote) => mapDatabaseNoteToNote(note));

    res.json({
      success: true,
      data: {
        notes: formattedNotes,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get deleted notes error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * Create a new note
 * POST /api/notes
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { title, content, color = 'default' } = req.body;

  // Validation
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Title and content are required',
      },
    });
  }

  try {
    const supabase = db.getClient();
    
    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        color: color,
        is_pinned: false,
        is_deleted: false,
        version: 1,
      })
      .select()
      .single();

    if (error || !note) {
      logger.error(`Failed to create note for user ${user.id}:`, error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create note',
        },
      });
    }

    const formattedNote = mapDatabaseNoteToNote(note as DatabaseNote);

    logger.info(`Note created: ${formattedNote.id} for user ${user.email}`);

    res.status(201).json({
      success: true,
      data: {
        note: formattedNote,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Create note error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * Get a specific note
 * GET /api/notes/:id
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Note ID is required',
      },
    });
  }

  try {
    const supabase = db.getClient();
    
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !note) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
        },
      });
    }

    const formattedNote = mapDatabaseNoteToNote(note as DatabaseNote);

    res.json({
      success: true,
      data: {
        note: formattedNote,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get note error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * Update a note
 * PUT /api/notes/:id
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;
  const { title, content, color } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Note ID is required',
      },
    });
  }

  // Validation
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Title and content are required',
      },
    });
  }

  try {
    const supabase = db.getClient();
    
    // First, get the existing note to check version
    const { data: existingNote, error: fetchError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingNote) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
        },
      });
    }

    // Update the note
    const updateData: Partial<DatabaseNote> = {
      title: title.trim(),
      content: content.trim(),
      updated_at: new Date().toISOString(),
      version: (existingNote as DatabaseNote).version + 1,
    };

    if (color) {
      updateData.color = color;
    }

    const { data: note, error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !note) {
      logger.error(`Failed to update note ${id} for user ${user.id}:`, error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update note',
        },
      });
    }

    const formattedNote = mapDatabaseNoteToNote(note as DatabaseNote);

    logger.info(`Note updated: ${formattedNote.id} for user ${user.email}`);

    res.json({
      success: true,
      data: {
        note: formattedNote,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Update note error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * Soft delete a note
 * DELETE /api/notes/:id
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Note ID is required',
      },
    });
  }

  try {
    const supabase = db.getClient();
    
    const { data: note, error } = await supabase
      .from('notes')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !note) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
        },
      });
    }

    logger.info(`Note soft deleted: ${(note as DatabaseNote).id} for user ${user.email}`);

    res.json({
      success: true,
      data: {
        message: 'Note deleted successfully',
        noteId: (note as DatabaseNote).id,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * Restore a deleted note
 * POST /api/notes/:id/restore
 */
router.post('/:id/restore', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Note ID is required',
      },
    });
  }

  try {
    const supabase = db.getClient();
    
    const { data: note, error } = await supabase
      .from('notes')
      .update({
        is_deleted: false,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !note) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
        },
      });
    }

    const formattedNote = mapDatabaseNoteToNote(note as DatabaseNote);

    logger.info(`Note restored: ${formattedNote.id} for user ${user.email}`);

    res.json({
      success: true,
      data: {
        note: formattedNote,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Restore note error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * Permanently delete a note
 * DELETE /api/notes/:id/permanent
 */
router.delete('/:id/permanent', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Note ID is required',
      },
    });
  }

  try {
    const supabase = db.getClient();
    
    const { data: note, error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !note) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
        },
      });
    }

    logger.info(`Note permanently deleted: ${(note as DatabaseNote).id} for user ${user.email}`);

    res.json({
      success: true,
      data: {
        message: 'Note permanently deleted',
        noteId: (note as DatabaseNote).id,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Permanent delete note error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

/**
 * Toggle pin status of a note
 * PATCH /api/notes/:id/pin
 */
router.patch('/:id/pin', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Note ID is required',
      },
    });
  }

  try {
    const supabase = db.getClient();
    
    // First get the current pin status
    const { data: existingNote, error: fetchError } = await supabase
      .from('notes')
      .select('is_pinned')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingNote) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
        },
      });
    }

    // Toggle the pin status
    const { data: note, error } = await supabase
      .from('notes')
      .update({
        is_pinned: !(existingNote as DatabaseNote).is_pinned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !note) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update pin status',
        },
      });
    }

    const formattedNote = mapDatabaseNoteToNote(note as DatabaseNote);

    res.json({
      success: true,
      data: {
        note: formattedNote,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Toggle pin error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

export { router as notesRouter };