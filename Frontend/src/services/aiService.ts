import { apiClient, ApiResponse } from '@/lib/api';

// AI request/response types
interface SummarizeRequest {
  noteId: string;
  content: string;
  level?: 'short' | 'medium' | 'detail';
}

interface GrammarCheckRequest {
  noteId: string;
  content: string;
}

interface VoiceToTextRequest {
  noteId: string;
  audioFile: File;
}

interface AIJobResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface SummarizeResult {
  summary: string;
  originalLength: number;
  summaryLength: number;
}

interface GrammarCheckResult {
  corrections: Array<{
    type: 'grammar' | 'spelling' | 'style';
    original: string;
    suggestion: string;
    position: {
      start: number;
      end: number;
    };
    explanation?: string;
  }>;
  score: number;
  totalIssues: number;
}

interface VoiceToTextResult {
  text: string;
  confidence: number;
  language?: string;
  duration?: number;
}

class AIService {
  /**
   * Summarize note content
   */
  async summarizeNote(data: SummarizeRequest): Promise<AIJobResponse> {
    try {
      const response = await apiClient.post<AIJobResponse>('/ai/summarize', data);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to start summarization');
    } catch (error) {
      console.error('Summarize note error:', error);
      throw error;
    }
  }

  /**
   * Check grammar and spelling
   */
  async checkGrammar(data: GrammarCheckRequest): Promise<AIJobResponse> {
    try {
      const response = await apiClient.post<AIJobResponse>('/ai/grammar-check', data);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to start grammar check');
    } catch (error) {
      console.error('Grammar check error:', error);
      throw error;
    }
  }

  /**
   * Convert voice to text
   */
  async voiceToText(data: VoiceToTextRequest): Promise<AIJobResponse> {
    try {
      const response = await apiClient.uploadFile<AIJobResponse>(
        '/ai/voice-to-text',
        data.audioFile,
        { noteId: data.noteId }
      );
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to start voice-to-text conversion');
    } catch (error) {
      console.error('Voice to text error:', error);
      throw error;
    }
  }

  /**
   * Get AI job status and result
   */
  async getJobStatus(jobId: string): Promise<AIJobResponse> {
    try {
      const response = await apiClient.get<AIJobResponse>(`/ai/jobs/${jobId}`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error?.message || 'Failed to get job status');
    } catch (error) {
      console.error('Get job status error:', error);
      throw error;
    }
  }

  /**
   * Poll job status until completion
   */
  async waitForJobCompletion(
    jobId: string,
    onProgress?: (status: string) => void,
    timeout = 60000 // 1 minute timeout
  ): Promise<AIJobResponse> {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          // Check timeout
          if (Date.now() - startTime > timeout) {
            reject(new Error('AI job timeout'));
            return;
          }

          const jobStatus = await this.getJobStatus(jobId);
          
          // Call progress callback
          if (onProgress) {
            onProgress(jobStatus.status);
          }

          // Check if job is complete
          if (jobStatus.status === 'completed') {
            resolve(jobStatus);
            return;
          }

          if (jobStatus.status === 'failed') {
            reject(new Error(jobStatus.error || 'AI job failed'));
            return;
          }

          // Continue polling if still processing
          if (jobStatus.status === 'pending' || jobStatus.status === 'processing') {
            setTimeout(poll, pollInterval);
            return;
          }

          // Unknown status
          reject(new Error(`Unknown job status: ${jobStatus.status}`));
        } catch (error) {
          reject(error);
        }
      };

      // Start polling
      poll();
    });
  }

  /**
   * Summarize note and wait for result
   */
  async summarizeNoteAndWait(
    data: SummarizeRequest,
    onProgress?: (status: string) => void
  ): Promise<SummarizeResult> {
    const job = await this.summarizeNote(data);
    const completedJob = await this.waitForJobCompletion(job.jobId, onProgress);
    return completedJob.result as SummarizeResult;
  }

  /**
   * Check grammar and wait for result
   */
  async checkGrammarAndWait(
    data: GrammarCheckRequest,
    onProgress?: (status: string) => void
  ): Promise<GrammarCheckResult> {
    const job = await this.checkGrammar(data);
    const completedJob = await this.waitForJobCompletion(job.jobId, onProgress);
    return completedJob.result as GrammarCheckResult;
  }

  /**
   * Convert voice to text and wait for result
   */
  async voiceToTextAndWait(
    data: VoiceToTextRequest,
    onProgress?: (status: string) => void
  ): Promise<VoiceToTextResult> {
    const job = await this.voiceToText(data);
    const completedJob = await this.waitForJobCompletion(job.jobId, onProgress);
    return completedJob.result as VoiceToTextResult;
  }

  /**
   * Check if AI features are available for current user
   */
  async checkAIAvailability(): Promise<{ available: boolean; reason?: string }> {
    try {
      const response = await apiClient.get<{ available: boolean; reason?: string }>('/ai/availability');
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return { available: false, reason: 'Unable to check AI availability' };
    } catch (error) {
      console.error('Check AI availability error:', error);
      return { available: false, reason: 'AI service unavailable' };
    }
  }
}

// Export singleton instance
export const aiService = new AIService();

// Export types
export type {
  SummarizeRequest,
  GrammarCheckRequest,
  VoiceToTextRequest,
  AIJobResponse,
  SummarizeResult,
  GrammarCheckResult,
  VoiceToTextResult,
};