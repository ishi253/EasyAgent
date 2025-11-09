import { Agent } from '../App';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Stack,
  Typography,
  Grid,
  Box,
  Paper,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

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
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="md" fullWidth>
      <DialogTitle>{agent.name}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Chip label={agent.category} color="secondary" variant="outlined" sx={{ width: 'fit-content' }} />
          <Typography variant="body1" color="text.secondary">
            {agent.description}
          </Typography>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              System Prompt
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'rgba(148,163,184,0.08)' }}>
              <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>
                {agent.prompt}
              </Typography>
            </Paper>
          </Box>
          <Grid container spacing={2} pt={2} borderTop="1px solid" borderColor="divider">
            <Grid item xs={12} sm={6}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CalendarTodayIcon fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">{formatDate(agent.createdAt)}</Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CalendarTodayIcon fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body2">{formatDate(agent.updatedAt)}</Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        <Button variant="contained" startIcon={<EditIcon fontSize="small" />} onClick={onEdit}>
          Edit Agent
        </Button>
      </DialogActions>
    </Dialog>
  );
}
