import { Agent } from '../App';
import { AgentCard } from './AgentCard';
import { Grid, Paper, Stack, Typography } from '@mui/material';

interface AgentLibraryProps {
  agents: Agent[];
  onUpdateAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
}

export function AgentLibrary({ agents, onUpdateAgent, onDeleteAgent }: AgentLibraryProps) {
  if (agents.length === 0) {
    return (
      <Paper variant="outlined" sx={{ textAlign: 'center', py: 8, px: 4 }}>
        <Stack spacing={1} alignItems="center">
          <Typography variant="h6">No agents found</Typography>
          <Typography variant="body2" color="text.secondary">
            Create your first agent to start building workflows.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Grid container spacing={3}>
      {agents.map((agent) => (
        <Grid key={agent.id} item xs={12} md={6} lg={4}>
          <AgentCard agent={agent} onUpdate={onUpdateAgent} onDelete={onDeleteAgent} />
        </Grid>
      ))}
    </Grid>
  );
}
