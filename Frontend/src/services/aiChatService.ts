import { apiClient } from '@/lib/api';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricing: {
    input: number;  // per 1M tokens
    output: number; // per 1M tokens
  };
  free: boolean;
  available: boolean;
}

class AIChatService {
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await apiClient.post('/ai/chat', request);
      return response.data;
    } catch (error: any) {
      console.error('AI Chat error:', error);
      throw new Error(
        error.response?.data?.error?.message || 
        'Failed to send message to AI'
      );
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    try {
      const response = await apiClient.get('/ai/models');
      return response.data.models;
    } catch (error: any) {
      console.error('Failed to fetch models:', error);
      throw new Error('Failed to fetch available models');
    }
  }

  async getModelUsage(): Promise<any> {
    try {
      const response = await apiClient.get('/ai/usage');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch usage:', error);
      throw new Error('Failed to fetch API usage');
    }
  }

  // Utility method to estimate token count (rough approximation)
  estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  // Calculate estimated cost for a request
  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const modelPricing: Record<string, { input: number; output: number }> = {
      'deepseek-chat': { input: 0, output: 0 }, // Free
      'deepseek-reasoner': { input: 0, output: 0 }, // Free
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 }, // per 1M tokens
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'claude-3-haiku': { input: 0.25, output: 1.25 }
    };

    const pricing = modelPricing[model];
    if (!pricing) return 0;

    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000;
  }
}

export const aiChatService = new AIChatService();