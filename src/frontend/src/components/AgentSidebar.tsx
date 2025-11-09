import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { Agent } from '../App';

interface AgentSidebarProps {
  agents: Agent[];
  onAddNode: (agentId: string) => void;
}

export function AgentSidebar({ agents, onAddNode }: AgentSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAgents = useMemo(() =>
    agents.filter((agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.category.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  [agents, searchQuery]);

  return (
    <Box
      width={320}
      display="flex"
      flexDirection="column"
      borderRight="1px solid"
      borderColor="divider"
      bgcolor="background.paper"
    >
      <Box px={3} py={3} borderBottom="1px solid" borderColor="divider">
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Agent Library
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search agents…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box flex={1} overflow="auto" px={3} py={2}>
        <Stack spacing={2}>
          {filteredAgents.map((agent) => (
            <Card
              key={agent.id}
              variant="outlined"
              sx={{
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: 4,
                },
              }}
              onClick={() => onAddNode(agent.id)}
            >
              <CardActionArea sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      width={40}
                      height={40}
                      borderRadius={2}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      sx={{
                        background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
                        color: '#fff',
                      }}
                    >
                      <AutoAwesomeIcon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600} lineHeight={1.2}>
                        {agent.name}
                      </Typography>
                      <Chip label={agent.category} size="small" color="secondary" variant="outlined" sx={{ mt: 0.5 }} />
                    </Box>
                  </Stack>
                  <AddCircleOutlineIcon color="action" fontSize="small" />
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {agent.description}
                </Typography>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </Box>

      <Box px={3} py={2} borderTop="1px solid" borderColor="divider" bgcolor="rgba(99,102,241,0.05)">
        <Typography variant="body2" color="text.secondary">
          💡 Click an agent to add it to the canvas.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect agents to orchestrate your workflow.
        </Typography>
      </Box>
    </Box>
  );
}
