import { Agent } from '../App';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Edit, Calendar } from 'lucide-react';

interface ViewAgentDialogProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function ViewAgentDialog({ agent, open, onOpenChange, onEdit }: ViewAgentDialogProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">
              {agent.category}
            </Badge>
            <DialogTitle>{agent.name}</DialogTitle>
            <DialogDescription>{agent.description}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div>
            <h4 className="mb-3 text-slate-900">System Prompt</h4>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-slate-700 whitespace-pre-wrap">{agent.prompt}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4" />
              <div>
                <p className="text-slate-500">Created</p>
                <p>{formatDate(agent.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4" />
              <div>
                <p className="text-slate-500">Last Updated</p>
                <p>{formatDate(agent.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onEdit} className="gap-2">
            <Edit className="w-4 h-4" />
            Edit Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
