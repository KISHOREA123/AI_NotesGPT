import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Plus, ChevronDown, Paperclip, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { aiChatService } from '@/services/aiChatService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: Date;
}

const AI_MODELS = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    description: 'Your AI assistant for creative writing, math problem-solving, file analysis, and brainstorming ideas. Let\'s make work and learning smarter!',
    color: 'bg-blue-500',
    free: true,
    official: true
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    provider: 'DeepSeek',
    description: 'Advanced reasoning for complex problems and step-by-step analysis',
    color: 'bg-purple-500',
    free: true,
    official: false
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'ChatGPT 3.5',
    provider: 'OpenAI',
    description: 'Fast and cost-effective conversational AI',
    color: 'bg-green-500',
    free: false,
    official: false
  },
  {
    id: 'gpt-4o-mini',
    name: 'ChatGPT 4o Mini',
    provider: 'OpenAI',
    description: 'Balanced performance and cost with advanced capabilities',
    color: 'bg-emerald-500',
    free: false,
    official: false
  }
];

export default function AIChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      model: selectedModel,
      createdAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSession(newSession);
  };

  const updateSessionTitle = (sessionId: string, firstMessage: string) => {
    const title = firstMessage.length > 50 
      ? firstMessage.substring(0, 50) + '...' 
      : firstMessage;
    
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, title }
        : session
    ));
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, title } : null);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    let session = currentSession;
    if (!session) {
      session = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        model: selectedModel,
        createdAt: new Date()
      };
      setSessions(prev => [session!, ...prev]);
      setCurrentSession(session);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    };

    const updatedSession = {
      ...session,
      messages: [...session.messages, userMessage]
    };
    setCurrentSession(updatedSession);
    setSessions(prev => prev.map(s => s.id === session!.id ? updatedSession : s));

    if (session.messages.length === 0) {
      updateSessionTitle(session.id, message.trim());
    }

    setMessage('');
    setIsLoading(true);

    try {
      const response = await aiChatService.sendMessage({
        model: selectedModel,
        messages: updatedSession.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        model: selectedModel
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMessage]
      };

      setCurrentSession(finalSession);
      setSessions(prev => prev.map(s => s.id === session!.id ? finalSession : s));

    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectedModelInfo = AI_MODELS.find(m => m.id === selectedModel);

  // Show welcome screen if no current session
  if (!currentSession) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-medium">AI Chat</h1>
          </div>
          <Button variant="ghost" size="icon">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Welcome Content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto px-6">
          {/* Model Avatar and Info */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="text-2xl font-semibold">{selectedModelInfo?.name}</h2>
              {selectedModelInfo?.official && (
                <Badge variant="secondary" className="text-xs">Official</Badge>
              )}
            </div>
            <p className="text-muted-foreground text-center max-w-md">
              {selectedModelInfo?.description}
            </p>
          </div>

          {/* Model Selector */}
          <div className="w-full max-w-sm mb-8">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedModelInfo?.color}`} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${model.color}`} />
                      <span>{model.name}</span>
                      {model.free && <Badge variant="secondary" className="text-xs ml-2">Free</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Input Area */}
          <div className="w-full max-w-2xl">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything!"
                className="min-h-[120px] resize-none pr-12 text-base"
                disabled={isLoading}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={sendMessage} 
                  disabled={!message.trim() || isLoading}
                  size="icon"
                  className="h-8 w-8"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center justify-center mt-4">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs text-muted-foreground"
              >
                DeepThink (R1)
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat interface when session exists
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-lg font-medium">AI Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={createNewSession}>
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
          <Button variant="ghost" size="icon">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {currentSession.messages.map((msg, index) => (
            <div key={msg.id} className="mb-8">
              {msg.role === 'user' ? (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium mb-2">You</div>
                    <div className="text-foreground whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{selectedModelInfo?.name}</span>
                      {selectedModelInfo?.official && (
                        <Badge variant="secondary" className="text-xs">Official</Badge>
                      )}
                    </div>
                    <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="mb-8">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{selectedModelInfo?.name}</span>
                    {selectedModelInfo?.official && (
                      <Badge variant="secondary" className="text-xs">Official</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything!"
              className="min-h-[60px] resize-none pr-12 text-base border-0 shadow-none focus-visible:ring-0 bg-muted/50"
              disabled={isLoading}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button 
                onClick={sendMessage} 
                disabled={!message.trim() || isLoading}
                size="icon"
                className="h-8 w-8"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Model Selector and Actions */}
          <div className="flex items-center justify-between mt-3">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-auto border-0 shadow-none h-auto p-0 gap-1 text-sm text-muted-foreground hover:text-foreground">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedModelInfo?.color}`} />
                  <SelectValue />
                  <ChevronDown className="h-3 w-3" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${model.color}`} />
                      <span>{model.name}</span>
                      {model.free && <Badge variant="secondary" className="text-xs ml-2">Free</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs text-muted-foreground h-auto p-1"
            >
              DeepThink (R1)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}