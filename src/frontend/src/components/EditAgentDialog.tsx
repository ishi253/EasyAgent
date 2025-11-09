import { useState, useEffect } from 'react';
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

interface EditAgentDialogProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateAgent: (agent: Agent) => void;
}

export function EditAgentDialog({ agent, open, onOpenChange, onUpdateAgent }: EditAgentDialogProps) {
  const [formData, setFormData] = useState({
    name: agent.name,
    description: agent.description,
    prompt: agent.prompt,
    category: agent.category,
  });

  useEffect(() => {
    setFormData({
      name: agent.name,
      description: agent.description,
      prompt: agent.prompt,
      category: agent.category,
    });
  }, [agent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAgent({
      ...agent,
      ...formData,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="md" fullWidth>
      <DialogTitle>Edit Agent</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Update your agent's configuration and behavior.
        </Typography>
        <Stack spacing={3} component="form" id={`edit-agent-${agent.id}`} onSubmit={handleSubmit}>
          <TextField
            label="Agent Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="System Prompt"
            value={formData.prompt}
            onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
            required
            fullWidth
            multiline
            minRows={6}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" form={`edit-agent-${agent.id}`} variant="contained">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
