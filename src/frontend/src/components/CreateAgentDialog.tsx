import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
} from '@mui/material';
import { Agent } from '../App';
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="md" fullWidth>
      <DialogTitle>Create New Agent</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Define your AI agent's purpose and behavior with a custom prompt.
        </Typography>
        <Stack spacing={3} component="form" id="create-agent-form" onSubmit={handleSubmit}>
          <TextField
            label="Agent Name"
            placeholder="e.g., Content Writer"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Category"
            placeholder="e.g., Writing, Development, Marketing"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Description"
            placeholder="Brief description of what this agent does"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="System Prompt"
            placeholder="You are an expert..."
            value={formData.prompt}
            onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
            required
            fullWidth
            multiline
            minRows={6}
            helperText="This prompt defines how the agent behaves and responds to requests."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onOpenChange(false)} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="create-agent-form" variant="contained">
          Create Agent
        </Button>
      </DialogActions>
    </Dialog>
  );
}
