import { useMemo, useState } from 'react';
import { Box, Button, Collapse, Grid, Paper, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Agent } from '../App';
import { CreateAgentDialog } from './CreateAgentDialog';
import { AgentDetailPanel } from './AgentDetailPanel';

interface AgentLibraryPageProps {
  agents: Agent[];
  onCreateAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAgentRunResult: (agentId: string, inputText: string, outputText: string) => void;
}

export function AgentLibraryPage({ agents, onCreateAgent, onAgentRunResult }: AgentLibraryPageProps) {
  const [open, setOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const getTimestamp = (value?: string) => (value ? new Date(value).getTime() : 0);

  const sortedAgents = useMemo(
    () =>
      [...agents].sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)),
    [agents]
  );

  return (
    <Box display="flex" flexDirection="column" height="100%" px={4} py={4} gap={3} overflow="hidden">
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={600}>
          Agent Library
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          New Agent
        </Button>
      </Stack>

      <Box flex={1} overflow="auto" pr={1}>
        {sortedAgents.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              borderStyle: 'dashed',
              textAlign: 'center',
              p: 6,
            }}
          >
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              No agents yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click “New Agent” to create your first assistant.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {sortedAgents.map((agent) => {
              const active = agent.id === selectedAgentId;
              return (
                <Grid item xs={12} sm={6} lg={4} key={agent.id}>
                  <Stack spacing={1.5}>
                    <Paper
                      variant="outlined"
                      onClick={() => setSelectedAgentId(active ? null : agent.id)}
                      sx={{
                        p: 2.5,
                        textAlign: 'center',
                        borderWidth: 2,
                        borderColor: active ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: active ? 4 : 1,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={600}>
                        {agent.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {agent.category}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {agent.description}
                      </Typography>
                    </Paper>
                    <Collapse in={active} unmountOnExit>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <AgentDetailPanel
                          agent={agent}
                          onClose={() => setSelectedAgentId(null)}
                          onRunAgentResult={onAgentRunResult}
                        />
                      </Paper>
                    </Collapse>
                  </Stack>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      <CreateAgentDialog
        open={open}
        onOpenChange={setOpen}
        onCreateAgent={(agent) => {
          onCreateAgent(agent);
          setOpen(false);
        }}
      />
    </Box>
  );
}
