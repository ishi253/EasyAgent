import { useEffect, useState } from 'react';
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
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
const baseEnv = "http://127.0.0.1:8000"

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function CreateAgentDialog({ open, onOpenChange, onCreateAgent }: CreateAgentDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
    category: '',
  });

  // reset when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({ name: '', description: '', prompt: '', category: '' });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
 
    const newAgentObject = { //FETCH DATA TO BACKEND API
      name: formData.name.trim(),
      description: formData.description.trim(),
      prompt: formData.prompt.trim(),
      category: formData.category.trim(),
    };

    console.log('Compiled agent data:', newAgentObject);
    if (!newAgentObject) return;
    try {
      const response = await fetch(`${baseEnv}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAgentObject),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Backend error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      console.log("Backend response:", data);
    } catch (error) {
      console.error("Failed to send workflow to backend:", error);
    }
    onCreateAgent(newAgentObject);
    setFormData({ name: '', description: '', prompt: '', category: '' });
    onOpenChange(false); // close
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Define your AI agent's purpose and behavior with a custom prompt
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                placeholder="e.g., Content Writer"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g., Writing, Development, Marketing"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of what this agent does"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">System Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="You are an expert..."
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                rows={8}
                required
              />
              <p className="text-slate-500">
                This prompt defines how the agent will behave and respond to requests
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Agent</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
