import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { authenticateToken, requireEmailVerification } from '@/middleware/auth';
import { db } from '@/services/database';
import { logger } from '@/utils/logger';
import { NotFoundError, ValidationError } from '@/middleware/errorHandler';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireEmailVerification);

/**
 * Get all notes for the authenticated user
 * GET /api/notes
 */
router.get('/', asyncHandler(async (req, res) => {
  const user = req.user!;
  const { 
    page = 1, 
    limit = 20, 
    search, 
    color, 
    pinned, 
    sortBy = 'updated_at', 
    sortOrder = 'desc' 
  } = req.query;

  try {
    const supabase = db.getClient();
    
    // Build query
    let query = supabase
      .from('notes')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_deleted', false);

    // Apply filters
    if (search && typeof search === 'string') {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    if (color && typeof color === 'string') {
      query = query.eq('color', color);
    }

    if (pinned !== undefined) {
      query = query.eq('is_pinned', pinned === 'true');
    }

    // Apply sorting
    const validSortFields = ['created_at', 'updated_at', 'title'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'updated_at';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    
    query = query.order(sortField, { ascending: order === 'asc' });

    // Apply pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    query = query.range(offset, offset + limitNum - 1);

    const { data: notes, error, count } = await query;

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

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Format notes for response
    const formattedNotes = (notes || []).map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      color: note.color,
      isPinned: note.is_pinned,
      isDeleted: note.is_deleted,
      deletedAt: note.deleted_at,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      version: note.version,
    }));

    logger.debug(`Fetched ${formattedNotes.length} notes for user ${user.email}`);

    res.json({
      success: true,
      data: formattedNotes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages,
        hasNext,
        hasPrev,
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
        message: 'Failed to fetch notes',
      },
    });
  }
}));

/**
 * Get deleted notes for the authenticated user
 * GET /api/notes/deleted
 */
router.get('/deleted', asyncHandler(async (req, res) => {
  const user = req.user!;

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
    const formattedNotes = (notes || []).map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      color: note.color,
      isPinned: note.is_pinned,
      isDeleted: note.is_deleted,
      deletedAt: note.deleted_at,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      version: note.version,
    }));

    res.json({
      success: true,
      data: formattedNotes,
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
        message: 'Failed to fetch deleted notes',
      },
    });
  }
}));

/**
 * Create a new note
 * POST /api/notes
 */
router.post('/', asyncHandler(async (req, res) => {
  const user = req.user!;
  const { title, content, color = 'default' } = req.body;

  // Validate input
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new ValidationError('Title is required', 'title', title);
  }

  if (!content || typeof content !== 'string') {
    throw new ValidationError('Content is required', 'content', content);
  }

  if (title.trim().length > 500) {
    throw new ValidationError('Title must be less than 500 characters', 'title', title);
  }

  const validColors = ['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];
  if (!validColors.includes(color)) {
    throw new ValidationError('Invalid color', 'color', color);
  }

  try {
    const supabase = db.getClient();
    
    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: title.trim(),
        content: content,
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

    // Format note for response
    const formattedNote = {
      id: note.id,
      title: note.title,
      content: note.content,
      color: note.color,
      isPinned: note.is_pinned,
      isDeleted: note.is_deleted,
      deletedAt: note.deleted_at,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      version: note.version,
    };

    logger.info(`Note created: ${note.id} for user ${user.email}`);

    res.status(201).json({
      success: true,
      data: formattedNote,
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
        message: 'Failed to create note',
      },
    });
  }
}));

/**
 * Get a specific note by ID
 * GET /api/notes/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const user = req.user!;
  const { id } = req.params;

  try {
    const supabase = db.getClient();
    
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !note) {
      throw new NotFoundError('Note');
    }

    // Format note for response
    const formattedNote = {
      id: note.id,
      title: note.title,
      content: note.content,
      color: note.color,
      isPinned: note.is_pinned,
      isDeleted: note.is_deleted,
      deletedAt: note.deleted_at,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      version: note.version,
    };

    res.json({
      success: true,
      data: formattedNote,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error('Get note error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch note',
      },
    });
  }
}));

/**
 * Update a note
 * PUT /api/notes/:id
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { title, content, color, isPinned } = req.body;

  // Validate input
  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    throw new ValidationError('Title must be a non-empty string', 'title', title);
  }

  if (title && title.trim().length > 500) {
    throw new ValidationError('Title must be less than 500 characters', 'title', title);
  }

  if (content !== undefined && typeof content !== 'string') {
    throw new ValidationError('Content must be a string', 'content', content);
  }

  const validColors = ['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];
  if (color !== undefined && !validColors.includes(color)) {
    throw new ValidationError('Invalid color', 'color', color);
  }

  try {
    const supabase = db.getClient();
    
    // First, check if note exists and belongs to user
    const { data: existingNote, error: fetchError } = await supabase
      .from('notes')
      .select('version')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingNote) {
      throw new NotFoundError('Note');
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
      version: existingNote.version + 1,
    };

    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content;
    if (color !== undefined) updateData.color = color;
    if (isPinned !== undefined) updateData.is_pinned = Boolean(isPinned);

    // Update the note
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

    // Format note for response
    const formattedNote = {
      id: note.id,
      title: note.title,
      content: note.content,
      color: note.color,
      isPinned: note.is_pinned,
      isDeleted: note.is_deleted,
      deletedAt: note.deleted_at,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      version: note.version,
    };

    logger.info(`Note updated: ${note.id} for user ${user.email}`);

    res.json({
      success: true,
      data: formattedNote,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    logger.error('Update note error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update note',
      },
    });
  }
}));

/**
 * Soft delete a note
 * DELETE /api/notes/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const user = req.user!;
  const { id } = req.params;

  try {
    const supabase = db.getClient();
    
    // Soft delete the note
    const { data: note, error } = await supabase
      .from('notes')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_deleted', false) // Only delete if not already deleted
      .select()
      .single();

    if (error || !note) {
      throw new NotFoundError('Note');
    }

    logger.info(`Note soft deleted: ${note.id} for user ${user.email}`);

    res.json({
      success: true,
      data: {
        message: 'Note moved to trash',
        noteId: note.id,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete note',
      },
    });
  }
}));

/**
 * Restore a deleted note
 * POST /api/notes/:id/restore
 */
router.post('/:id/restore', asyncHandler(async (req, res) => {
  const user = req.user!;
  const { id } = req.params;

  try {
    const supabase = db.getClient();
    
    // Restore the note
    const { data: note, error } = await supabase
      .from('notes')
      .update({
        is_deleted: false,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_deleted', true) // Only restore if currently deleted
      .select()
      .single();

    if (error || !note) {
      throw new NotFoundError('Deleted note');
    }

    // Format note for response
    const formattedNote = {
      id: note.id,
      title: note.title,
      content: note.content,
      color: note.color,
      isPinned: note.is_pinned,
      isDeleted: note.is_deleted,
      deletedAt: note.deleted_at,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      version: note.version,
    };

    logger.info(`Note restored: ${note.id} for user ${user.email}`);

    res.json({
      success: true,
      data: formattedNote,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error('Restore note error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to restore note',
      },
    });
  }
}));

/**
 * Permanently delete a note
 * DELETE /api/notes/:id/permanent
 */
router.delete('/:id/permanent', asyncHandler(async (req, res) => {
  const user = req.user!;
  const { id } = req.params;

  try {
    const supabase = db.getClient();
    
    // Permanently delete the note
    const { data: note, error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_deleted', true) // Only permanently delete if already soft deleted
      .select()
      .single();

    if (error || !note) {
      throw new NotFoundError('Deleted note');
    }

    logger.info(`Note permanently deleted: ${note.id} for user ${user.email}`);

    res.json({
      success: true,
      data: {
        message: 'Note permanently deleted',
        noteId: note.id,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error('Permanent delete note error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to permanently delete note',
      },
    });
  }
}));

export { router as notesRouter };