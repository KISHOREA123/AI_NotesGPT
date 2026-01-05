import { logger } from '@/utils/logger';

// AI service types
export interface SummarizationResult {
  summary: string;
  originalLength: number;
  summaryLength: number;
  compressionRatio: number;
}

export interface GrammarCheckResult {
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
}

export interface VoiceToTextResult {
  text: string;
  confidence: number;
  language: string;
}

class AIService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      logger.info('AI Service: Initializing...');
      this.initialized = true;
      logger.info('AI Service: Initialized successfully');
    } catch (error) {
      logger.error('AI Service: Failed to initialize:', error);
      this.initialized = false;
    }
  }

  /**
   * Summarize text content
   */
  async summarizeText(
    content: string, 
    level: 'brief' | 'balanced' | 'detailed' = 'balanced'
  ): Promise<SummarizationResult> {
    if (!this.initialized) {
      throw new Error('AI service not initialized');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Content is required for summarization');
    }

    try {
      logger.debug(`Summarizing text (${level}): ${content.length} characters`);
      
      // Use local summarization algorithm
      const summary = this.generateLocalSummary(content, level);
      
      const result: SummarizationResult = {
        summary,
        originalLength: content.length,
        summaryLength: summary.length,
        compressionRatio: Math.round((summary.length / content.length) * 100) / 100,
      };

      logger.debug(`Summarization complete: ${result.compressionRatio}x compression`);
      return result;
    } catch (error) {
      logger.error('Summarization failed:', error);
      throw new Error('Failed to summarize text');
    }
  }

  /**
   * Check grammar and spelling
   */
  async checkGrammar(content: string): Promise<GrammarCheckResult> {
    if (!this.initialized) {
      throw new Error('AI service not initialized');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Content is required for grammar checking');
    }

    try {
      logger.debug(`Checking grammar: ${content.length} characters`);
      
      const corrections = this.generateGrammarCorrections(content);
      const score = Math.max(0, 100 - (corrections.length * 5));

      const result: GrammarCheckResult = {
        corrections,
        score,
      };

      logger.debug(`Grammar check complete: ${corrections.length} issues found, score: ${score}`);
      return result;
    } catch (error) {
      logger.error('Grammar check failed:', error);
      throw new Error('Failed to check grammar');
    }
  }

  /**
   * Convert speech to text (placeholder)
   */
  async speechToText(): Promise<VoiceToTextResult> {
    // This is a placeholder - actual implementation would use Web Speech API on frontend
    return {
      text: 'Speech-to-text functionality is handled by the frontend using Web Speech API',
      confidence: 1.0,
      language: 'en-US',
    };
  }

  /**
   * Generate local summary using extractive summarization
   */
  private generateLocalSummary(content: string, level: 'brief' | 'balanced' | 'detailed'): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) {
      return content;
    }

    // Determine target length based on level
    let targetSentences: number;
    switch (level) {
      case 'brief':
        targetSentences = Math.max(1, Math.ceil(sentences.length * 0.2));
        break;
      case 'detailed':
        targetSentences = Math.max(2, Math.ceil(sentences.length * 0.6));
        break;
      default: // balanced
        targetSentences = Math.max(1, Math.ceil(sentences.length * 0.4));
    }

    // Score sentences based on word frequency and position
    const wordFreq = this.calculateWordFrequency(content);
    const scoredSentences = sentences.map((sentence, index) => {
      const words = sentence.toLowerCase().split(/\s+/);
      const score = words.reduce((sum, word) => {
        const cleanWord = word.replace(/[^\w]/g, '');
        return sum + (wordFreq[cleanWord] || 0);
      }, 0) / words.length;
      
      // Boost score for sentences at the beginning
      const positionBoost = index < sentences.length * 0.3 ? 1.2 : 1.0;
      
      return {
        sentence: sentence.trim(),
        score: score * positionBoost,
        index,
      };
    });

    // Select top sentences
    const selectedSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, targetSentences)
      .sort((a, b) => a.index - b.index)
      .map(s => s.sentence);

    return selectedSentences.join('. ') + '.';
  }

  /**
   * Calculate word frequency for summarization
   */
  private calculateWordFrequency(text: string): Record<string, number> {
    const words = text.toLowerCase().split(/\s+/);
    const frequency: Record<string, number> = {};
    
    // Common stop words to ignore
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);

    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 2 && !stopWords.has(cleanWord)) {
        frequency[cleanWord] = (frequency[cleanWord] || 0) + 1;
      }
    });

    return frequency;
  }

  /**
   * Generate grammar corrections using rule-based approach
   */
  private generateGrammarCorrections(content: string): GrammarCheckResult['corrections'] {
    const corrections: GrammarCheckResult['corrections'] = [];
    const text = content.toLowerCase();

    // Common grammar rules
    const rules = [
      {
        pattern: /\bi\s+am\s+going\s+to\s+went\b/g,
        type: 'grammar' as const,
        suggestion: 'I am going to go',
        explanation: 'Incorrect verb tense combination'
      },
      {
        pattern: /\bthere\s+is\s+\w+\s+\w+s\b/g,
        type: 'grammar' as const,
        suggestion: 'there are',
        explanation: 'Subject-verb disagreement with plural nouns'
      },
      {
        pattern: /\byour\s+welcome\b/g,
        type: 'spelling' as const,
        suggestion: "you're welcome",
        explanation: 'Incorrect use of "your" instead of "you\'re"'
      },
      {
        pattern: /\bits\s+a\s+\w+\s+day\b/g,
        type: 'spelling' as const,
        suggestion: "it's a",
        explanation: 'Missing apostrophe in "it\'s"'
      }
    ];

    rules.forEach(rule => {
      let match;
      while ((match = rule.pattern.exec(text)) !== null) {
        corrections.push({
          type: rule.type,
          original: match[0],
          suggestion: rule.suggestion,
          position: {
            start: match.index,
            end: match.index + match[0].length
          },
          explanation: rule.explanation
        });
      }
    });

    // Check for repeated words
    const words = content.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const currentWord = words[i];
      const nextWord = words[i + 1];
      
      if (currentWord && nextWord && 
          currentWord.toLowerCase() === nextWord.toLowerCase() && 
          currentWord.length > 2 && 
          corrections.length < 8) {
        corrections.push({
          type: 'style',
          original: `${currentWord} ${nextWord}`,
          suggestion: currentWord,
          position: {
            start: content.indexOf(`${currentWord} ${nextWord}`),
            end: content.indexOf(`${currentWord} ${nextWord}`) + `${currentWord} ${nextWord}`.length
          },
          explanation: 'Repeated word'
        });
      }
    }

    return corrections.slice(0, 10); // Limit to 10 corrections
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const aiService = new AIService();