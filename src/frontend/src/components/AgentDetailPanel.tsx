import { useEffect, useState } from 'react';
import { Agent } from '../App';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';

interface AgentDetailPanelProps {
  agent: Agent | null;
  onClose: () => void;
  onRunAgentResult?: (agentId: string, inputText: string, outputText: string) => void;
}

const baseEnv = "http://127.0.0.1:8000";

export function AgentDetailPanel({ agent, onClose, onRunAgentResult }: AgentDetailPanelProps) {
  // If no agent is selected, we render nothing.
  // The parent component's animation will handle the sliding.
  if (!agent) {
    return null;
  }

  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputText(agent.lastInput ?? '');
    setOutputText(agent.lastOutput ?? '');
    setError(null);
  }, [agent]);

  const handleRunAgent = async () => {
    if (!agent) return;
    setIsRunning(true);
    setError(null);
    try {
      const response = await fetch(`${baseEnv}/agents/${agent.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_text: inputText }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to run agent (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      const normalizedInput = typeof data.input === 'string' ? data.input : inputText;
      const normalizedOutput = typeof data.output === 'string' ? data.output : '';
      setInputText(normalizedInput);
      setOutputText(normalizedOutput);
      onRunAgentResult?.(agent.id, normalizedInput, normalizedOutput);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error while running agent.';
      setError(message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" fontWeight={600}>
          Agent Details
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          width={48}
          height={48}
          borderRadius={2}
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{ background: 'linear-gradient(135deg,#3b82f6,#a855f7)', color: '#fff' }}
        >
          <AutoAwesomeIcon />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {agent.name}
          </Typography>
          <Chip label={agent.category} size="small" color="secondary" variant="outlined" />
        </Box>
      </Stack>

      <Box>
        <Typography variant="caption" color="text.secondary">
          Description
        </Typography>
        <Typography variant="body2" color="text.primary">
          {agent.description}
        </Typography>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary">
          System Prompt
        </Typography>
        <Paper variant="outlined" sx={{ mt: 1, p: 2, backgroundColor: 'rgba(99,102,241,0.05)' }}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {agent.prompt}
          </Typography>
        </Paper>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary">
          Run Input
        </Typography>
        <TextField
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Provide context or a question for this agent…"
          multiline
          minRows={3}
          fullWidth
          sx={{ mt: 1 }}
        />
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          startIcon={<PlayArrowRoundedIcon fontSize="small" />}
          onClick={handleRunAgent}
          disabled={isRunning}
        >
          {isRunning ? 'Running…' : 'Run Agent'}
        </Button>
      </Stack>

      <Box>
        <Typography variant="caption" color="text.secondary">
          Latest Output
        </Typography>
        <Paper variant="outlined" sx={{ mt: 1, p: 2, minHeight: 120 }}>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {outputText || 'No output yet. Run the agent to view results.'}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
