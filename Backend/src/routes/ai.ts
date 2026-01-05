import { Router, Request, Response } from 'express';
import { authenticateToken } from '@/middleware/auth-simple';
import { asyncHandler } from '@/middleware/errorHandler';
import { aiService } from '@/services/ai';
import { aiChatService } from '@/services/ai-chat';
import { logger } from '@/utils/logger';
import { User } from '@/types';

const router = Router();

// Extend Request interface for authenticated routes
interface AuthenticatedRequest extends Request {
  user: User;
}

// Apply authentication to all AI routes
router.use(authenticateToken);

/**
 * Check AI service availability
 * GET /api/ai/availability
 */
router.get('/availability', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const isAvailable = aiService.isAvailable();
    
    res.json({
      success: true,
      data: {
        available: isAvailable,
        services: {
          summarization: isAvailable,
          grammarCheck: isAvailable,
          speechToText: true, // Always available via Web Speech API
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('AI availability check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AVAILABILITY_CHECK_FAILED',
        message: 'Failed to check AI service availability',
      },
    });
  }
}));

/**
 * Summarize text content
 * POST /api/ai/summarize
 */
router.post('/summarize', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { content, level = 'balanced' } = req.body;
  const user = req.user;

  // Validation
  if (!content || typeof content !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Content is required and must be a string',
      },
    });
  }

  if (content.length < 50) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'CONTENT_TOO_SHORT',
        message: 'Content must be at least 50 characters long for summarization',
      },
    });
  }

  if (!['brief', 'balanced', 'detailed'].includes(level)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_LEVEL',
        message: 'Level must be one of: brief, balanced, detailed',
      },
    });
  }

  try {
    logger.info(`Starting summarization for user ${user.email} with level: ${level}`);
    const result = await aiService.summarizeText(content, level);
    
    logger.info(`Summarization completed for user ${user.email}`);

    res.json({
      success: true,
      data: {
        summary: result.summary,
        originalLength: result.originalLength,
        summaryLength: result.summaryLength,
        compressionRatio: result.compressionRatio,
        level,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Summarization failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SUMMARIZATION_FAILED',
        message: 'Failed to summarize content',
      },
    });
  }
}));

/**
 * Check grammar and spelling
 * POST /api/ai/grammar-check
 */
router.post('/grammar-check', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { content } = req.body;
  const user = req.user;

  // Validation
  if (!content || typeof content !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Content is required and must be a string',
      },
    });
  }

  if (content.length < 10) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'CONTENT_TOO_SHORT',
        message: 'Content must be at least 10 characters long for grammar checking',
      },
    });
  }

  try {
    logger.info(`Starting grammar check for user ${user.email}`);
    const result = await aiService.checkGrammar(content);
    
    logger.info(`Grammar check completed for user ${user.email}: ${result.corrections.length} issues found`);

    res.json({
      success: true,
      data: {
        corrections: result.corrections,
        score: result.score,
        issuesFound: result.corrections.length,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Grammar check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GRAMMAR_CHECK_FAILED',
        message: 'Failed to check grammar',
      },
    });
  }
}));

/**
 * Speech to text conversion (placeholder)
 * POST /api/ai/speech-to-text
 */
router.post('/speech-to-text', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  try {
    logger.info(`Speech-to-text request from user ${user.email}`);
    const result = await aiService.speechToText();
    
    res.json({
      success: true,
      data: {
        text: result.text,
        confidence: result.confidence,
        language: result.language,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Speech-to-text failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SPEECH_TO_TEXT_FAILED',
        message: 'Failed to convert speech to text',
      },
    });
  }
}));

/**
 * Get AI usage statistics (placeholder)
 * GET /api/ai/stats
 */
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  try {
    // This would typically come from a database or analytics service
    const stats = {
      totalRequests: 0,
      summarizationRequests: 0,
      grammarCheckRequests: 0,
      speechToTextRequests: 0,
      averageResponseTime: 0,
    };

    logger.debug(`AI stats requested by user ${user.email}`);

    res.json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get AI stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_FAILED',
        message: 'Failed to get AI statistics',
      },
    });
  }
}));

// ===== AI CHAT ROUTES =====

/**
 * Send message to AI model
 * POST /api/ai/chat
 */
router.post('/chat', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { model, messages, temperature = 0.7, max_tokens = 2000 } = req.body;
  const user = req.user;

  // Validation
  if (!model || !messages || !Array.isArray(messages)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Model and messages are required'
      }
    });
  }

  try {
    // Check if user has access to the model
    const hasAccess = await aiChatService.checkModelAccess(user.id, model);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'MODEL_ACCESS_DENIED',
          message: 'Upgrade to Pro to access this AI model'
        }
      });
    }

    // Send message to AI
    const response = await aiChatService.sendMessage({
      model,
      messages,
      temperature,
      max_tokens,
      userId: user.id
    });

    // Log usage for billing/analytics
    await aiChatService.logUsage(user.id, {
      model,
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      cost: response.cost || 0
    });

    res.json({
      success: true,
      data: {
        content: response.content,
        model: response.model,
        usage: response.usage
      }
    });

  } catch (error: any) {
    logger.error('AI Chat error:', error);
    
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please try again later.'
        }
      });
    }

    if (error.code === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Insufficient API credits. Please upgrade your plan.'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: error.message || 'Failed to process AI request'
      }
    });
  }
}));

/**
 * Get available AI models
 * GET /api/ai/models
 */
router.get('/models', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  try {
    const models = await aiChatService.getAvailableModels(user.id);

    res.json({
      success: true,
      data: {
        models
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch models:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_MODELS_ERROR',
        message: 'Failed to fetch available models'
      }
    });
  }
}));

/**
 * Get user's AI usage statistics
 * GET /api/ai/usage
 */
router.get('/usage', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  try {
    const usage = await aiChatService.getUserUsage(user.id);

    res.json({
      success: true,
      data: usage
    });

  } catch (error: any) {
    logger.error('Failed to fetch usage:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_USAGE_ERROR',
        message: 'Failed to fetch usage statistics'
      }
    });
  }
}));

/**
 * Get chat history
 * GET /api/ai/history
 */
router.get('/history', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { page = 1, limit = 20 } = req.query;

  try {
    const history = await aiChatService.getChatHistory(user.id, {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: history
    });

  } catch (error: any) {
    logger.error('Failed to fetch chat history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_HISTORY_ERROR',
        message: 'Failed to fetch chat history'
      }
    });
  }
}));

export { router as aiRouter };