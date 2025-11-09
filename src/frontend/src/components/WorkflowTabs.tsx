import { useState } from 'react';
import { Workflow } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Plus, MoreHorizontal, Edit, Trash2, Copy } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface WorkflowTabsProps {
  workflows: Workflow[];
  currentWorkflowId: string;
  onSelectWorkflow: (workflowId: string) => void;
  onCreateWorkflow: (name: string, context: string) => void; // updated
  onRenameWorkflow: (workflowId: string, newName: string) => void;
  onDeleteWorkflow: (workflowId: string) => void;
  onDuplicateWorkflow: (workflowId: string) => void;
}

export function WorkflowTabs({
  workflows,
  currentWorkflowId,
  onSelectWorkflow,
  onCreateWorkflow,
  onRenameWorkflow,
  onDeleteWorkflow,
  onDuplicateWorkflow,
}: WorkflowTabsProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowContext, setNewWorkflowContext] = useState(''); // new

  const handleCreateWorkflow = () => {
    if (newWorkflowName.trim()) {
      onCreateWorkflow(newWorkflowName.trim(), newWorkflowContext.trim());
      setNewWorkflowName('');
      setNewWorkflowContext('');
      setIsCreateDialogOpen(false);
    }
  };

  const handleRenameWorkflow = () => {
    if (selectedWorkflowId && newWorkflowName.trim()) {
      onRenameWorkflow(selectedWorkflowId, newWorkflowName.trim());
      setNewWorkflowName('');
      setIsRenameDialogOpen(false);
      setSelectedWorkflowId(null);
    }
  };

  const handleDeleteWorkflow = () => {
    if (selectedWorkflowId) {
      onDeleteWorkflow(selectedWorkflowId);
      setIsDeleteDialogOpen(false);
      setSelectedWorkflowId(null);
    }
  };

  const openRenameDialog = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      setSelectedWorkflowId(workflowId);
      setNewWorkflowName(workflow.name);
      setIsRenameDialogOpen(true);
    }
  };

  const openDeleteDialog = (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto">
        {workflows.map((workflow) => (
          <div
            key={workflow.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              workflow.id === currentWorkflowId
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-slate-100 border-2 border-transparent hover:border-slate-300'
            }`}
          >
            <button
              onClick={() => onSelectWorkflow(workflow.id)}
              className="flex-1 text-left"
              title={workflow.context ? `Context: ${workflow.context}` : undefined}
            >
              <span className={workflow.id === currentWorkflowId ? 'font-medium text-blue-700' : 'text-slate-700'}>
                {workflow.name}
              </span>
              {workflow.context ? (
                <div className="text-xs text-slate-500 truncate max-w-[180px]">
                  {workflow.context}
                </div>
              ) : null}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-slate-200 transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openRenameDialog(workflow.id)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicateWorkflow(workflow.id)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openDeleteDialog(workflow.id)}
                  disabled={workflows.length === 1}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
          className="gap-1 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </Button>
      </div>

      {/* Create Workflow Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>
              Give your workflow a descriptive name and optional context.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                placeholder="e.g., Content Pipeline, Data Analysis Flow"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateWorkflow();
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workflow-context">Context / Situation</Label>
              <Input
                id="workflow-context"
                placeholder="e.g., Q4 marketing campaign, data cleanup, onboarding"
                value={newWorkflowContext}
                onChange={(e) => setNewWorkflowContext(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateWorkflow();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkflow} disabled={!newWorkflowName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Workflow Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Workflow</DialogTitle>
            <DialogDescription>
              Enter a new name for your workflow
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-workflow">Workflow Name</Label>
              <Input
                id="rename-workflow"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameWorkflow();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
              <Button onClick={handleRenameWorkflow} disabled={!newWorkflowName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workflow Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workflow and all its agents and connections. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkflow}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
