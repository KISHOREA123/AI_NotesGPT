import axios from 'axios';
import { logger } from '@/utils/logger';
import { db } from '@/services/database';
import { cacheService } from '@/services/cache';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  userId: string;
}

interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost?: number;
}

interface ModelConfig {
  id: string;
  name: string;
  provider: 'deepseek' | 'openai' | 'anthropic';
  baseUrl: string;
  apiKey: string;
  free: boolean;
  tierRequired: 'free' | 'pro';
  pricing: {
    input: number;  // per 1M tokens
    output: number; // per 1M tokens
  };
}

class AIChatService {
  private models: ModelConfig[] = [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      free: true,
      tierRequired: 'free',
      pricing: { input: 0, output: 0 }
    },
    {
      id: 'deepseek-reasoner',
      name: 'DeepSeek Reasoner',
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      free: true,
      tierRequired: 'free',
      pricing: { input: 0, output: 0 }
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'ChatGPT 3.5 Turbo',
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY || '',
      free: false,
      tierRequired: 'pro',
      pricing: { input: 0.5, output: 1.5 }
    },
    {
      id: 'gpt-4o-mini',
      name: 'ChatGPT 4o Mini',
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY || '',
      free: false,
      tierRequired: 'pro',
      pricing: { input: 0.15, output: 0.6 }
    },
    {
      id: 'claude-3-haiku',
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      free: false,
      tierRequired: 'pro',
      pricing: { input: 0.25, output: 1.25 }
    }
  ];

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const model = this.models.find(m => m.id === request.model);
    if (!model) {
      throw new Error(`Model ${request.model} not found`);
    }

    if (!model.apiKey) {
      throw new Error(`API key not configured for ${model.name}`);
    }

    // Check rate limits
    await this.checkRateLimit(request.userId, request.model);

    try {
      let response: ChatResponse;

      switch (model.provider) {
        case 'deepseek':
          response = await this.callDeepSeekAPI(model, request);
          break;
        case 'openai':
          response = await this.callOpenAIAPI(model, request);
          break;
        case 'anthropic':
          response = await this.callAnthropicAPI(model, request);
          break;
        default:
          throw new Error(`Provider ${model.provider} not supported`);
      }

      // Calculate cost
      if (response.usage) {
        response.cost = this.calculateCost(
          response.usage.prompt_tokens,
          response.usage.completion_tokens,
          model
        );
      }

      return response;

    } catch (error: any) {
      logger.error(`AI Chat error for model ${request.model}:`, error);
      
      if (error.response?.status === 429) {
        throw { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded' };
      }
      
      if (error.response?.status === 402 || error.response?.status === 403) {
        throw { code: 'INSUFFICIENT_CREDITS', message: 'Insufficient API credits' };
      }

      throw new Error(error.message || 'AI service error');
    }
  }

  private async callDeepSeekAPI(model: ModelConfig, request: ChatRequest): Promise<ChatResponse> {
    const response = await axios.post(
      `${model.baseUrl}/chat/completions`,
      {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.max_tokens || 2000,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${model.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const choice = response.data.choices[0];
    return {
      content: choice.message.content,
      model: request.model,
      usage: response.data.usage
    };
  }

  private async callOpenAIAPI(model: ModelConfig, request: ChatRequest): Promise<ChatResponse> {
    const response = await axios.post(
      `${model.baseUrl}/chat/completions`,
      {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.max_tokens || 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${model.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const choice = response.data.choices[0];
    return {
      content: choice.message.content,
      model: request.model,
      usage: response.data.usage
    };
  }

  private async callAnthropicAPI(model: ModelConfig, request: ChatRequest): Promise<ChatResponse> {
    // Convert messages format for Anthropic
    const systemMessage = request.messages.find(m => m.role === 'system');
    const conversationMessages = request.messages.filter(m => m.role !== 'system');

    const response = await axios.post(
      `${model.baseUrl}/messages`,
      {
        model: request.model,
        messages: conversationMessages,
        system: systemMessage?.content,
        max_tokens: request.max_tokens || 2000,
        temperature: request.temperature || 0.7
      },
      {
        headers: {
          'x-api-key': model.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 30000
      }
    );

    return {
      content: response.data.content[0].text,
      model: request.model,
      usage: response.data.usage
    };
  }

  async checkModelAccess(userId: string, modelId: string): Promise<boolean> {
    const model = this.models.find(m => m.id === modelId);
    if (!model) return false;

    // Free models are always accessible
    if (model.free) return true;

    // Check user's subscription tier
    const user = await db.query(
      'SELECT subscription_tier FROM users WHERE id = $1',
      [userId]
    );

    if (!user.rows.length) return false;

    const userTier = user.rows[0].subscription_tier || 'free';
    return model.tierRequired === 'free' || userTier === 'pro';
  }

  async getAvailableModels(userId: string) {
    const user = await db.query(
      'SELECT subscription_tier FROM users WHERE id = $1',
      [userId]
    );

    const userTier = user.rows[0]?.subscription_tier || 'free';

    return this.models.map(model => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      free: model.free,
      available: model.free || userTier === 'pro',
      tierRequired: model.tierRequired,
      pricing: model.pricing,
      hasApiKey: !!model.apiKey
    }));
  }

  private async checkRateLimit(userId: string, model: string): Promise<void> {
    const key = `rate_limit:${userId}:${model}`;
    const current = await cacheService.get(key);
    
    // Free tier: 10 requests per hour per model
    // Pro tier: 100 requests per hour per model
    const user = await db.query(
      'SELECT subscription_tier FROM users WHERE id = $1',
      [userId]
    );
    
    const userTier = user.rows[0]?.subscription_tier || 'free';
    const limit = userTier === 'pro' ? 100 : 10;
    
    if (current && parseInt(current) >= limit) {
      throw { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded' };
    }

    // Increment counter
    const newCount = current ? parseInt(current) + 1 : 1;
    await cacheService.set(key, newCount.toString(), 3600); // 1 hour TTL
  }

  async logUsage(userId: string, usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }): Promise<void> {
    try {
      await db.query(
        `INSERT INTO ai_usage_logs (user_id, model, input_tokens, output_tokens, cost, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, usage.model, usage.inputTokens, usage.outputTokens, usage.cost]
      );
    } catch (error) {
      logger.error('Failed to log AI usage:', error);
    }
  }

  async getUserUsage(userId: string) {
    const result = await db.query(
      `SELECT 
         model,
         COUNT(*) as request_count,
         SUM(input_tokens) as total_input_tokens,
         SUM(output_tokens) as total_output_tokens,
         SUM(cost) as total_cost
       FROM ai_usage_logs 
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY model
       ORDER BY total_cost DESC`,
      [userId]
    );

    return {
      monthly_usage: result.rows,
      total_requests: result.rows.reduce((sum, row) => sum + parseInt(row.request_count), 0),
      total_cost: result.rows.reduce((sum, row) => sum + parseFloat(row.total_cost || 0), 0)
    };
  }

  async getChatHistory(userId: string, options: { page: number; limit: number }) {
    const offset = (options.page - 1) * options.limit;
    
    const result = await db.query(
      `SELECT model, input_tokens, output_tokens, cost, created_at
       FROM ai_usage_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, options.limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) FROM ai_usage_logs WHERE user_id = $1',
      [userId]
    );

    return {
      history: result.rows,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / options.limit)
      }
    };
  }

  private calculateCost(inputTokens: number, outputTokens: number, model: ModelConfig): number {
    return (inputTokens * model.pricing.input + outputTokens * model.pricing.output) / 1000000;
  }
}

export const aiChatService = new AIChatService();