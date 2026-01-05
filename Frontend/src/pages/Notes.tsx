import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid, List, Pin, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNotes } from '@/context/NotesContext';
import { useAuth } from '@/context/AuthContext';
import { formatDate, truncateText, cn } from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

const noteColors: Record<string, string> = {
  default: 'bg-note-default',
  amber: 'bg-note-amber',
  emerald: 'bg-note-emerald',
  sky: 'bg-note-sky',
  violet: 'bg-note-violet',
  rose: 'bg-note-rose',
};

export default function Notes() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'pinned'>('all');
  const { notes, deleteNote, togglePin, isLoading } = useNotes();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Add null safety for notes
  const safeNotes = notes || [];

  const filteredNotes = safeNotes
    .filter(n => filter === 'all' || n.isPinned)
    .filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()));

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);

  const handleDelete = async (id: string) => {
    try {
      await deleteNote(id);
      toast({ title: 'Note moved to trash' });
    } catch (error) {
      toast({ 
        title: 'Failed to delete note', 
        description: 'Please try again later',
        variant: 'destructive' 
      });
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      await togglePin(id);
      const note = safeNotes.find(n => n.id === id);
      toast({ 
        title: note?.isPinned ? 'Note unpinned' : 'Note pinned' 
      });
    } catch (error) {
      toast({ 
        title: 'Failed to update note', 
        description: 'Please try again later',
        variant: 'destructive' 
      });
    }
  };

  const NoteCard = ({ note }: { note: typeof notes[0] }) => (
    <div className={cn("note-card cursor-pointer group", noteColors[note.color])} onClick={() => navigate(`/notes/${note.id}`)}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium truncate flex-1">{note.title}</h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleTogglePin(note.id)}>
                <Pin className="h-4 w-4 mr-2" />{note.isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(note.id)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {note.isPinned && <Pin className="h-4 w-4 text-primary" />}
      </div>
      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{truncateText(note.content, 120)}</p>
      <p className="text-xs text-muted-foreground pt-3 border-t border-border/50">{formatDate(note.updatedAt)}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search notes..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant={filter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('all')}>All</Button>
          <Button variant={filter === 'pinned' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('pinned')}>Pinned</Button>
          <div className="border-l border-border mx-2" />
          <Button variant="ghost" size="icon-sm" onClick={() => setView('grid')} className={view === 'grid' ? 'bg-secondary' : ''}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setView('list')} className={view === 'list' ? 'bg-secondary' : ''}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading && safeNotes.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <EmptyState title="No notes found" description={search ? 'Try a different search' : 'Create your first note'} action={{ label: 'Create Note', onClick: () => navigate('/notes/new') }} />
      ) : (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Pinned</h2>
              <div className={cn("gap-4", view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col')}>
                {pinnedNotes.map(note => <NoteCard key={note.id} note={note} />)}
              </div>
            </div>
          )}
          {unpinnedNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && <h2 className="text-sm font-medium text-muted-foreground mb-3">Others</h2>}
              <div className={cn("gap-4", view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col')}>
                {unpinnedNotes.map(note => <NoteCard key={note.id} note={note} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
