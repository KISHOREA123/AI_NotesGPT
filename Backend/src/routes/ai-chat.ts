import express from 'express';
import { authMiddleware } from '../middleware/auth-simple';
import { aiChatService } from '../services/ai-chat';
import { logger } from '../utils/logger';

const router = express.Router();

// Send message to AI model
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { model, messages, temperature = 0.7, max_tokens = 2000 } = req.body;
    const userId = req.user!.id;

    // Validate request
    if (!model || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Model and messages are required'
        }
      });
    }

    // Check if user has access to the model (implement tier restrictions)
    const hasAccess = await aiChatService.checkModelAccess(userId, model);
    if (!hasAccess) {
      return res.status(403).json({
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
      userId
    });

    // Log usage for billing/analytics
    await aiChatService.logUsage(userId, {
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
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please try again later.'
        }
      });
    }

    if (error.code === 'INSUFFICIENT_CREDITS') {
      return res.status(402).json({
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Insufficient API credits. Please upgrade your plan.'
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'AI_SERVICE_ERROR',
        message: error.message || 'Failed to process AI request'
      }
    });
  }
});

// Get available models
router.get('/models', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const models = await aiChatService.getAvailableModels(userId);

    res.json({
      success: true,
      data: {
        models
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch models:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_MODELS_ERROR',
        message: 'Failed to fetch available models'
      }
    });
  }
});

// Get user's API usage statistics
router.get('/usage', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const usage = await aiChatService.getUserUsage(userId);

    res.json({
      success: true,
      data: usage
    });

  } catch (error: any) {
    logger.error('Failed to fetch usage:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_USAGE_ERROR',
        message: 'Failed to fetch usage statistics'
      }
    });
  }
});

// Get chat history (optional feature)
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    const history = await aiChatService.getChatHistory(userId, {
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
      error: {
        code: 'FETCH_HISTORY_ERROR',
        message: 'Failed to fetch chat history'
      }
    });
  }
});

export default router;