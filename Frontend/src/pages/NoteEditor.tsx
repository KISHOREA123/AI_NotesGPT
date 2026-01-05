import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Bold, Italic, Heading1, List as ListIcon, Palette, Type, AlignLeft, Sparkles, FileCheck, Mic, Eye, Edit, X, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNotes } from '@/context/NotesContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { countWords, cn } from '@/lib/utils';
import { NoteColor } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { aiService } from '@/services/aiService';

const colors: { value: NoteColor; class: string; name: string; color: string }[] = [
  { value: 'default', class: 'bg-note-default', name: 'Default', color: 'hsl(var(--card))' },
  { value: 'amber', class: 'bg-note-amber', name: 'Amber', color: 'hsl(38 70% 15%)' },
  { value: 'emerald', class: 'bg-note-emerald', name: 'Emerald', color: 'hsl(142 50% 12%)' },
  { value: 'sky', class: 'bg-note-sky', name: 'Sky', color: 'hsl(198 50% 14%)' },
  { value: 'violet', class: 'bg-note-violet', name: 'Violet', color: 'hsl(270 50% 14%)' },
  { value: 'rose', class: 'bg-note-rose', name: 'Rose', color: 'hsl(350 50% 14%)' },
];

export default function NoteEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notes, createNote, updateNote } = useNotes();
  const { user } = useAuth();
  const { toast } = useToast();

  const existingNote = id && id !== 'new' ? notes.find(n => n.id === id) : null;
  const isPro = user?.plan === 'pro';

  const [title, setTitle] = useState(existingNote?.title || '');
  const [content, setContent] = useState(existingNote?.content || '');
  const [color, setColor] = useState<NoteColor>(existingNote?.color || 'default');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [aiResults, setAiResults] = useState<{
    type: 'summary' | 'grammar' | 'voice' | null;
    data: any;
    isVisible: boolean;
  }>({
    type: null,
    data: null,
    isVisible: false,
  });
  const [aiAvailable, setAiAvailable] = useState<boolean>(true);

  // Check AI availability on component mount
  useEffect(() => {
    const checkAIAvailability = async () => {
      try {
        const availability = await aiService.checkAIAvailability();
        setAiAvailable(availability.available);
      } catch (error) {
        console.error('Failed to check AI availability:', error);
        setAiAvailable(false);
      }
    };

    checkAIAvailability();
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      if (existingNote) {
        await updateNote(existingNote.id, { title, content, color });
        toast({ title: 'Note updated successfully' });
      } else {
        await createNote(title, content, color);
        toast({ title: 'Note created successfully' });
      }
      navigate('/notes');
    } catch (error) {
      toast({ 
        title: 'Save failed', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Toolbar formatting functions
  const formatText = (format: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let newContent = '';
    let newCursorStart = start;
    let newCursorEnd = end;
    
    switch (format) {
      case 'bold':
        if (selectedText) {
          // If text is selected, wrap it with bold markdown
          newContent = content.substring(0, start) + '**' + selectedText + '**' + content.substring(end);
          newCursorStart = start + 2;
          newCursorEnd = end + 2;
        } else {
          // If no selection, insert bold placeholder
          const boldText = 'bold text';
          newContent = content.substring(0, start) + '**' + boldText + '**' + content.substring(start);
          newCursorStart = start + 2;
          newCursorEnd = start + 2 + boldText.length;
        }
        break;
        
      case 'italic':
        if (selectedText) {
          // If text is selected, wrap it with italic markdown
          newContent = content.substring(0, start) + '*' + selectedText + '*' + content.substring(end);
          newCursorStart = start + 1;
          newCursorEnd = end + 1;
        } else {
          // If no selection, insert italic placeholder
          const italicText = 'italic text';
          newContent = content.substring(0, start) + '*' + italicText + '*' + content.substring(start);
          newCursorStart = start + 1;
          newCursorEnd = start + 1 + italicText.length;
        }
        break;
        
      case 'heading':
        // Add heading at the beginning of the current line
        const lineStart = content.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = content.indexOf('\n', start);
        const actualLineEnd = lineEnd === -1 ? content.length : lineEnd;
        const currentLine = content.substring(lineStart, actualLineEnd);
        
        if (currentLine.startsWith('# ')) {
          // Remove heading
          newContent = content.substring(0, lineStart) + currentLine.substring(2) + content.substring(actualLineEnd);
          newCursorStart = Math.max(lineStart, start - 2);
          newCursorEnd = Math.max(lineStart, end - 2);
        } else {
          // Add heading
          newContent = content.substring(0, lineStart) + '# ' + currentLine + content.substring(actualLineEnd);
          newCursorStart = start + 2;
          newCursorEnd = end + 2;
        }
        break;
        
      case 'list':
        // Add list item at the beginning of the current line
        const listLineStart = content.lastIndexOf('\n', start - 1) + 1;
        const listLineEnd = content.indexOf('\n', start);
        const actualListLineEnd = listLineEnd === -1 ? content.length : listLineEnd;
        const listCurrentLine = content.substring(listLineStart, actualListLineEnd);
        
        if (listCurrentLine.startsWith('- ')) {
          // Remove list
          newContent = content.substring(0, listLineStart) + listCurrentLine.substring(2) + content.substring(actualListLineEnd);
          newCursorStart = Math.max(listLineStart, start - 2);
          newCursorEnd = Math.max(listLineStart, end - 2);
        } else {
          // Add list
          newContent = content.substring(0, listLineStart) + '- ' + listCurrentLine + content.substring(actualListLineEnd);
          newCursorStart = start + 2;
          newCursorEnd = end + 2;
        }
        break;
        
      default:
        return;
    }
    
    // Update content
    setContent(newContent);
    
    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  };

  // Enhanced markdown renderer for preview
  const renderMarkdown = (text: string) => {
    if (!text) return '';
    
    let html = text
      // Headers (process first to avoid conflicts)
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Lists - handle multiple consecutive list items
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      // Wrap consecutive list items in ul tags
      .replace(/(<li>.*<\/li>)(\n<li>.*<\/li>)*/g, (match) => {
        return '<ul>' + match.replace(/\n/g, '') + '</ul>';
      })
      // Paragraphs - split by double newlines
      .split('\n\n')
      .map(paragraph => {
        // Don't wrap headers, lists, or already wrapped content in p tags
        if (paragraph.match(/^<(h[1-6]|ul|ol|li|blockquote)/)) {
          return paragraph;
        }
        // Don't wrap empty paragraphs
        if (!paragraph.trim()) {
          return '';
        }
        return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
      })
      .filter(p => p.trim())
      .join('');

    return html;
  };

  const handleAIFeature = async (feature: string) => {
    if (!isPro) {
      toast({ 
        title: 'Pro Feature', 
        description: 'Upgrade to Pro to unlock AI features',
        variant: 'destructive' 
      });
      return;
    }

    if (!existingNote) {
      toast({
        title: 'Save Note First',
        description: 'Please save your note before using AI features',
        variant: 'destructive'
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'No Content',
        description: 'Please add some content to your note first',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);
      
      switch (feature) {
        case 'Summarizer':
          await handleSummarize();
          break;
        case 'Grammar Checker':
          await handleGrammarCheck();
          break;
        case 'Voice to Text':
          await handleVoiceToText();
          break;
        default:
          toast({
            title: 'Feature Not Available',
            description: 'This AI feature is not yet implemented',
            variant: 'destructive'
          });
      }
    } catch (error) {
      console.error('AI feature error:', error);
      toast({
        title: 'AI Feature Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!existingNote) return;

    try {
      const result = await aiService.summarizeNoteAndWait(
        {
          noteId: existingNote.id,
          content: content,
          level: summaryLevel,
        },
        (status) => {
          toast({
            title: `Generating ${summaryLevel.charAt(0).toUpperCase() + summaryLevel.slice(1)} Summary`,
            description: `Status: ${status}...`,
          });
        }
      );

      setAiResults({
        type: 'summary',
        data: result,
        isVisible: true,
      });

      const levelDescriptions = {
        short: 'Brief',
        medium: 'Balanced',
        detail: 'Comprehensive'
      };

      toast({
        title: `${levelDescriptions[summaryLevel]} Summary Generated`,
        description: `Original: ${result.originalLength} chars, Summary: ${result.summaryLength} chars`,
      });
    } catch (error) {
      throw error;
    }
  };

  const handleGrammarCheck = async () => {
    if (!existingNote) return;

    try {
      const result = await aiService.checkGrammarAndWait(
        {
          noteId: existingNote.id,
          content: content,
        },
        (status) => {
          toast({
            title: 'Checking Grammar',
            description: `Status: ${status}...`,
          });
        }
      );

      setAiResults({
        type: 'grammar',
        data: result,
        isVisible: true,
      });

      toast({
        title: 'Grammar Check Complete',
        description: `Found ${result.totalIssues} issues. Score: ${result.score}/100`,
      });
    } catch (error) {
      throw error;
    }
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [summaryLevel, setSummaryLevel] = useState<'short' | 'medium' | 'detail'>('medium');

  const handleVoiceToText = async () => {
    if (isRecording) {
      // Stop recording
      if (recognition) {
        recognition.stop();
        setIsRecording(false);
        setRecognition(null);
      }
      return;
    }

    // Start recording
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const newRecognition = new SpeechRecognition();
      
      newRecognition.continuous = true;
      newRecognition.interimResults = true;
      newRecognition.lang = 'en-US';

      newRecognition.onstart = () => {
        setIsRecording(true);
        toast({
          title: 'Voice Recording Started 🎤',
          description: 'Speak now... Click the microphone again to stop.',
        });
      };

      newRecognition.onresult = (event: any) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setContent(prev => prev + (prev ? '\n\n' : '') + finalTranscript);
        }
      };

      newRecognition.onerror = (event: any) => {
        setIsRecording(false);
        setRecognition(null);
        toast({
          title: 'Voice Recognition Error',
          description: `Error: ${event.error}`,
          variant: 'destructive'
        });
      };

      newRecognition.onend = () => {
        setIsRecording(false);
        setRecognition(null);
        toast({
          title: 'Voice Recording Stopped ⏹️',
          description: 'Transcription complete.',
        });
      };

      setRecognition(newRecognition);
      newRecognition.start();
    } else {
      toast({
        title: 'Voice Recognition Not Supported',
        description: 'Your browser does not support voice recognition.',
        variant: 'destructive'
      });
    }
  };

  // Add keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          formatText('bold');
          break;
        case 'i':
          e.preventDefault();
          formatText('italic');
          break;
        case 'Enter':
          e.preventDefault();
          handleSave();
          break;
      }
    }
  };

  const selectedColor = colors.find(c => c.value === color);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Action Bar */}
        <div className="flex-shrink-0 p-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/notes')} 
                className="gap-2 hover:bg-accent/50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Notes
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Type className="h-4 w-4" />
                <span>{countWords(content)} words</span>
              </div>
            </div>
            
            <Button 
              onClick={handleSave} 
              disabled={isSaving} 
              className="gap-2 px-6 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="flex-shrink-0 p-4 border-b border-border/50 bg-background/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 hover:bg-accent/50"
                onClick={() => formatText('bold')}
                disabled={isPreviewMode}
              >
                <Bold className="h-4 w-4" />
                <span className="hidden md:inline">Bold</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 hover:bg-accent/50"
                onClick={() => formatText('italic')}
                disabled={isPreviewMode}
              >
                <Italic className="h-4 w-4" />
                <span className="hidden md:inline">Italic</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 hover:bg-accent/50"
                onClick={() => formatText('heading')}
                disabled={isPreviewMode}
              >
                <Heading1 className="h-4 w-4" />
                <span className="hidden md:inline">Heading</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 hover:bg-accent/50"
                onClick={() => formatText('list')}
                disabled={isPreviewMode}
              >
                <ListIcon className="h-4 w-4" />
                <span className="hidden md:inline">List</span>
              </Button>
              
              <Separator orientation="vertical" className="h-6 mx-2" />

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 hover:bg-accent/50">
                    <Palette className="h-4 w-4" />
                    <span className="hidden sm:inline">{selectedColor?.name}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Choose Note Color</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {colors.map(c => (
                        <button
                          key={c.value}
                          onClick={() => setColor(c.value)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105",
                            color === c.value 
                              ? 'border-primary bg-primary/10 shadow-md' 
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <div
                            className="w-5 h-5 rounded-full border border-border/50"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="text-sm font-medium">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Preview Toggle */}
            <Button
              variant={isPreviewMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="gap-2"
            >
              {isPreviewMode ? (
                <>
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">Preview</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Editor Content - Fixed height, no scrolling */}
        <div className={cn("flex-1 flex flex-col min-h-0", selectedColor?.class)}>
          <div className="flex-1 p-8 flex flex-col min-h-0">
            <Input
              placeholder="Enter your note title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-3xl font-bold border-none bg-transparent px-0 mb-6 placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex-1 flex flex-col min-h-0">
              {isPreviewMode ? (
                // Preview Mode
                <div 
                  className="flex-1 overflow-y-auto markdown-preview"
                  dangerouslySetInnerHTML={{ 
                    __html: renderMarkdown(content) || '<p class="text-muted-foreground italic">No content to preview...</p>' 
                  }}
                />
              ) : (
                // Edit Mode
                <Textarea
                  placeholder="Start writing your thoughts... 

💡 Formatting tips:
• Ctrl+B or **text** for bold
• Ctrl+I or *text* for italic  
• # at start of line for headings
• - at start of line for lists
• Ctrl+Enter to save"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 text-lg leading-relaxed border-none bg-transparent px-0 resize-none placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-0"
                  style={{ 
                    fontFamily: 'inherit',
                    lineHeight: '1.6'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Features Sidebar */}
      <div className="w-80 border-l border-border bg-card/30 backdrop-blur-sm flex flex-col">
        {/* Sidebar Header */}
        <div className="flex-shrink-0 p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-xs text-muted-foreground">
                {isPro ? (aiAvailable ? 'AI features active' : 'AI service unavailable') : 'Upgrade for AI features'}
              </p>
            </div>
          </div>
        </div>

        {/* AI Features - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Summarizer */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="font-medium">Summarizer</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Generate a concise summary of your note content
              </p>
              
              {/* Summary Level Selection */}
              {isPro && aiAvailable && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Summary Level:</p>
                  <div className="flex gap-1">
                    {(['short', 'medium', 'detail'] as const).map((level) => (
                      <Button
                        key={level}
                        variant={summaryLevel === level ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSummaryLevel(level)}
                        className="flex-1 text-xs"
                      >
                        {level === 'short' && '📝 Brief'}
                        {level === 'medium' && '📄 Balanced'}
                        {level === 'detail' && '📚 Detailed'}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <Button 
                onClick={() => handleAIFeature('Summarizer')}
                disabled={!isPro || !content.trim() || isLoading || !aiAvailable}
                className="w-full gap-2"
                variant={isPro && aiAvailable ? "default" : "outline"}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isPro && aiAvailable ? 
                  `Generate ${summaryLevel.charAt(0).toUpperCase() + summaryLevel.slice(1)} Summary` : 
                  isPro ? 'AI Unavailable' : 'Pro Feature'
                }
              </Button>
            </div>

            <Separator />

            {/* Grammar Checker */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                <h4 className="font-medium">Grammar Check</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Check and fix grammar, spelling, and style issues
              </p>
              <Button 
                onClick={() => handleAIFeature('Grammar Checker')}
                disabled={!isPro || !content.trim() || isLoading || !aiAvailable}
                className="w-full gap-2"
                variant={isPro && aiAvailable ? "default" : "outline"}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileCheck className="h-4 w-4" />
                )}
                {isPro && aiAvailable ? 'Check Grammar' : isPro ? 'AI Unavailable' : 'Pro Feature'}
              </Button>
            </div>

            <Separator />

            {/* Voice to Text */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                <h4 className="font-medium">Voice to Text</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Convert speech to text and add to your note
              </p>
              <Button 
                onClick={handleVoiceToText}
                disabled={!isPro || isLoading || !aiAvailable}
                className={`w-full gap-2 ${isRecording ? 'bg-red-100 border-red-300 text-red-700 animate-pulse' : ''}`}
                variant={isPro && aiAvailable ? "default" : "outline"}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isRecording ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {isPro && aiAvailable ? 
                  (isRecording ? 'Stop Recording' : 'Start Recording') : 
                  isPro ? 'AI Unavailable' : 'Pro Feature'
                }
              </Button>
            </div>

            {/* Pro Upgrade Section for Free Users */}
            {!isPro && (
              <>
                <Separator />
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Unlock AI Features</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Get access to AI-powered summarization (3 levels), grammar checking, and voice-to-text features for just $2/month.
                  </p>
                  <Button 
                    size="sm" 
                    className="w-full" 
                    onClick={() => navigate('/subscription')}
                  >
                    Upgrade to Pro
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="flex-shrink-0 p-4 border-t border-border">
          <div className="text-center text-xs text-muted-foreground">
            {existingNote ? 'Editing existing note' : 'Creating new note'}
          </div>
        </div>
      </div>

      {/* AI Results Panel */}
      {aiResults.isVisible && (
        <div className="w-96 border-l border-border bg-card/20 backdrop-blur-sm flex flex-col">
          {/* Results Header */}
          <div className="flex-shrink-0 p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                {aiResults.type === 'summary' && <Sparkles className="h-5 w-5 text-primary" />}
                {aiResults.type === 'grammar' && <FileCheck className="h-5 w-5 text-primary" />}
                {aiResults.type === 'voice' && <Mic className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <h3 className="font-semibold">
                  {aiResults.type === 'summary' && 'Summary Results'}
                  {aiResults.type === 'grammar' && 'Grammar Check Results'}
                  {aiResults.type === 'voice' && 'Voice Transcription'}
                </h3>
                <p className="text-xs text-muted-foreground">AI Analysis Complete</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAiResults({ type: null, data: null, isVisible: false })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Results Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {aiResults.type === 'summary' && aiResults.data && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-medium mb-2">Generated Summary</h4>
                  <p className="text-sm leading-relaxed">{aiResults.data.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-background border">
                    <p className="text-muted-foreground">Original Length</p>
                    <p className="font-medium">{aiResults.data.originalLength} chars</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background border">
                    <p className="text-muted-foreground">Summary Length</p>
                    <p className="font-medium">{aiResults.data.summaryLength} chars</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setContent(prev => prev + '\n\n## Summary\n' + aiResults.data.summary);
                    setAiResults({ type: null, data: null, isVisible: false });
                  }}
                  className="w-full"
                >
                  Add Summary to Note
                </Button>
              </div>
            )}

            {aiResults.type === 'grammar' && aiResults.data && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Grammar Score</h4>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      aiResults.data.score >= 90 ? 'bg-green-100 text-green-800' :
                      aiResults.data.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {aiResults.data.score}/100
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Found {aiResults.data.totalIssues} issue{aiResults.data.totalIssues !== 1 ? 's' : ''}
                  </p>
                </div>

                {aiResults.data.corrections && aiResults.data.corrections.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Suggestions</h4>
                    {aiResults.data.corrections.map((correction: any, index: number) => (
                      <div key={index} className="p-3 rounded-lg bg-background border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            correction.type === 'grammar' ? 'bg-blue-100 text-blue-800' :
                            correction.type === 'spelling' ? 'bg-red-100 text-red-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {correction.type}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Original:</span> "{correction.original}"</p>
                          <p><span className="text-muted-foreground">Suggestion:</span> "{correction.suggestion}"</p>
                          {correction.explanation && (
                            <p className="text-xs text-muted-foreground">{correction.explanation}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {aiResults.type === 'voice' && aiResults.data && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-medium mb-2">Transcription</h4>
                  <p className="text-sm leading-relaxed">{aiResults.data.text}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-background border">
                    <p className="text-muted-foreground">Confidence</p>
                    <p className="font-medium">{Math.round(aiResults.data.confidence * 100)}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background border">
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">{aiResults.data.duration}s</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setContent(prev => prev + (prev ? '\n\n' : '') + aiResults.data.text);
                    setAiResults({ type: null, data: null, isVisible: false });
                  }}
                  className="w-full"
                >
                  Add Transcription to Note
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
