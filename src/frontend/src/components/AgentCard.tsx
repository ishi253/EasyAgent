import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Agent } from '../App';
import { EditAgentDialog } from './EditAgentDialog';
import { ViewAgentDialog } from './ViewAgentDialog';

interface AgentCardProps {
  agent: Agent;
  onUpdate: (agent: Agent) => void;
  onDelete: (id: string) => void;
}

export function AgentCard({ agent, onUpdate, onDelete }: AgentCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  return (
    <>
      <Card variant="outlined">
        <CardHeader
          action={
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          }
          title={
            <Typography variant="h6" fontWeight={600}>
              {agent.name}
            </Typography>
          }
          subheader={
            <Chip label={agent.category} size="small" color="secondary" variant="outlined" />
          }
        />
        <CardContent onClick={() => setIsViewDialogOpen(true)} sx={{ cursor: 'pointer' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {agent.description}
          </Typography>
          <Typography
            variant="body2"
            color="text.primary"
            sx={{
              backgroundColor: 'rgba(148,163,184,0.12)',
              borderRadius: 2,
              p: 1.5,
              mt: 1,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {agent.prompt}
          </Typography>
        </CardContent>
        <CardActions>
          <Button size="small" startIcon={<VisibilityIcon fontSize="small" />} onClick={() => setIsViewDialogOpen(true)}>
            View
          </Button>
          <Button size="small" startIcon={<EditIcon fontSize="small" />} onClick={() => setIsEditDialogOpen(true)}>
            Edit
          </Button>
        </CardActions>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem
            onClick={() => {
              setIsViewDialogOpen(true);
              setMenuAnchor(null);
            }}
          >
            <VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> View Details
          </MenuItem>
          <MenuItem
            onClick={() => {
              setIsEditDialogOpen(true);
              setMenuAnchor(null);
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              setIsDeleteDialogOpen(true);
              setMenuAnchor(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} /> Delete
          </MenuItem>
        </Menu>
      </Card>

      <EditAgentDialog
        agent={agent}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onUpdateAgent={onUpdate}
      />

      <ViewAgentDialog
        agent={agent}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        onEdit={() => {
          setIsViewDialogOpen(false);
          setIsEditDialogOpen(true);
        }}
      />

      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>Delete Agent?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently delete "{agent.name}". This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setIsDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              onDelete(agent.id);
              setIsDeleteDialogOpen(false);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
