import { Trash2, RotateCcw, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotes } from '@/context/NotesContext';
import { formatDate, getDaysUntilDeletion, cn } from '@/lib/utils';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/use-toast';

export default function RecycleBin() {
  const { deletedNotes, restoreNote, permanentlyDeleteNote } = useNotes();
  const { toast } = useToast();

  const handleRestore = async (id: string) => {
    await restoreNote(id);
    toast({ title: 'Note restored' });
  };

  const handleDelete = async (id: string) => {
    await permanentlyDeleteNote(id);
    toast({ title: 'Note permanently deleted' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Notes are automatically deleted after 30 days
          </p>
        </div>
      </div>

      {deletedNotes.length === 0 ? (
        <EmptyState icon={<Trash2 className="h-10 w-10 text-muted-foreground" />} title="Recycle bin is empty" description="Deleted notes will appear here" />
      ) : (
        <div className="grid gap-4">
          {deletedNotes.map((note) => (
            <div key={note.id} className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{note.title}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>Deleted {formatDate(note.deletedAt!)}</span>
                  <span className="flex items-center gap-1 text-warning">
                    <Clock className="h-3 w-3" />
                    {getDaysUntilDeletion(note.deletedAt)} days left
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleRestore(note.id)} className="gap-1">
                  <RotateCcw className="h-4 w-4" />Restore
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(note.id)} className="gap-1">
                  <Trash2 className="h-4 w-4" />Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
