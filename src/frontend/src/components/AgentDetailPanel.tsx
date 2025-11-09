import { Agent } from '../App';
import { Box, Chip, IconButton, Stack, Typography, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface AgentDetailPanelProps {
  agent: Agent | null;
  onClose: () => void;
}

export function AgentDetailPanel({ agent, onClose }: AgentDetailPanelProps) {
  // If no agent is selected, we render nothing.
  // The parent component's animation will handle the sliding.
  if (!agent) {
    return null;
  }

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
    </Box>
  );
}
