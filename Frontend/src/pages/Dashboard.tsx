import { useNavigate } from 'react-router-dom';
import { FileText, Clock, Pin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotes } from '@/context/NotesContext';
import { getGreeting, formatDate, truncateText } from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const { notes, isLoading } = useNotes();
  const navigate = useNavigate();

  // Ensure notes is always an array
  const safeNotes = notes || [];
  const recentNotes = safeNotes.slice(0, 5);

  const noteColorClasses: Record<string, string> = {
    default: 'bg-note-default',
    amber: 'bg-note-amber',
    emerald: 'bg-note-emerald',
    sky: 'bg-note-sky',
    violet: 'bg-note-violet',
    rose: 'bg-note-rose',
  };

  // Show loading state if still loading
  if (isLoading && safeNotes.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <p className="text-xl mb-1">
            {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0] || 'there'}</span>
          </p>
          <p className="text-muted-foreground">Loading your notes...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
              <div className="h-16 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Greeting */}
      <div>
        <p className="text-xl mb-1">
          {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0] || 'there'}</span>
        </p>
        <p className="text-muted-foreground">Here's what's happening with your notes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Notes', value: safeNotes.length, icon: FileText },
          { label: 'Pinned', value: safeNotes.filter(n => n.isPinned).length, icon: Pin },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Notes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Notes</h2>
          {safeNotes.length > 0 && (
            <button onClick={() => navigate('/notes')} className="text-sm text-primary hover:underline">
              View all
            </button>
          )}
        </div>

        {recentNotes.length === 0 ? (
          <EmptyState
            title="No notes yet"
            description="Create your first note to get started"
            action={{ label: 'Create Note', onClick: () => navigate('/notes/new') }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => navigate(`/notes/${note.id}`)}
                className={cn(
                  "note-card cursor-pointer hover-lift",
                  noteColorClasses[note.color]
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium truncate flex-1">{note.title}</h3>
                  {note.isPinned && <Pin className="h-4 w-4 text-primary flex-shrink-0" />}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {truncateText(note.content, 100)}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-3 border-t border-border/50">
                  <Clock className="h-3 w-3" />
                  {formatDate(note.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
