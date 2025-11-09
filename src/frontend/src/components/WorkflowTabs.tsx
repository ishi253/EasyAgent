import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Workflow } from '../App';

interface WorkflowTabsProps {
  workflows: Workflow[];
  currentWorkflowId: string;
  onSelectWorkflow: (workflowId: string) => void;
  onCreateWorkflow: (name: string, context: string) => void; // updated
  onRenameWorkflow: (workflowId: string, newName: string) => void;
  onDeleteWorkflow: (workflowId: string) => void;
  onDuplicateWorkflow: (workflowId: string) => void;
}

export function WorkflowTabs({
  workflows,
  currentWorkflowId,
  onSelectWorkflow,
  onCreateWorkflow,
  onRenameWorkflow,
  onDeleteWorkflow,
  onDuplicateWorkflow,
}: WorkflowTabsProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowContext, setNewWorkflowContext] = useState(''); // new
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuWorkflowId, setMenuWorkflowId] = useState<string | null>(null);

  const handleCreateWorkflow = () => {
    if (newWorkflowName.trim()) {
      onCreateWorkflow(newWorkflowName.trim(), newWorkflowContext.trim());
      setNewWorkflowName('');
      setNewWorkflowContext('');
      setIsCreateDialogOpen(false);
    }
  };

  const handleRenameWorkflow = () => {
    if (selectedWorkflowId && newWorkflowName.trim()) {
      onRenameWorkflow(selectedWorkflowId, newWorkflowName.trim());
      setNewWorkflowName('');
      setIsRenameDialogOpen(false);
      setSelectedWorkflowId(null);
    }
  };

  const handleDeleteWorkflow = () => {
    if (selectedWorkflowId) {
      onDeleteWorkflow(selectedWorkflowId);
      setIsDeleteDialogOpen(false);
      setSelectedWorkflowId(null);
    }
  };

  const openRenameDialog = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      setSelectedWorkflowId(workflowId);
      setNewWorkflowName(workflow.name);
      setIsRenameDialogOpen(true);
    }
  };

  const openDeleteDialog = (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    setIsDeleteDialogOpen(true);
  };

  const openMenuFor = (workflowId: string, anchor: HTMLElement) => {
    setMenuAnchor(anchor);
    setMenuWorkflowId(workflowId);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuWorkflowId(null);
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" overflow="auto" py={1}>
        {workflows.map((workflow) => (
          <Paper
            key={workflow.id}
            variant="outlined"
            onClick={() => onSelectWorkflow(workflow.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              borderWidth: 2,
              borderColor: workflow.id === currentWorkflowId ? 'primary.main' : 'transparent',
              backgroundColor: workflow.id === currentWorkflowId ? 'rgba(37,99,235,0.08)' : 'rgba(148,163,184,0.15)',
              cursor: 'pointer',
              minWidth: 200,
            }}
          >
            <Box flex={1} minWidth={0}>
              <Typography
                fontWeight={600}
                color={workflow.id === currentWorkflowId ? 'primary.main' : 'text.primary'}
                noWrap
              >
                {workflow.name}
              </Typography>
              {workflow.context && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {workflow.context}
                </Typography>
              )}
            </Box>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                openMenuFor(workflow.id, e.currentTarget);
              }}
            >
              <MoreHorizIcon fontSize="small" />
            </IconButton>
          </Paper>
        ))}

        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => setIsCreateDialogOpen(true)}
          sx={{ flexShrink: 0 }}
        >
          New Workflow
        </Button>
      </Stack>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            closeMenu();
            if (menuWorkflowId) openRenameDialog(menuWorkflowId);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Rename
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuWorkflowId) onDuplicateWorkflow(menuWorkflowId);
            closeMenu();
          }}
        >
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} /> Duplicate
        </MenuItem>
        <MenuItem
          disabled={workflows.length === 1}
          onClick={() => {
            closeMenu();
            if (menuWorkflowId) openDeleteDialog(menuWorkflowId);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Workflow</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Workflow Name"
              placeholder="e.g., Content Pipeline"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              autoFocus
            />
            <TextField
              label="Context / Situation"
              placeholder="e.g., Q4 marketing campaign"
              value={newWorkflowContext}
              onChange={(e) => setNewWorkflowContext(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setIsCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateWorkflow} disabled={!newWorkflowName.trim()} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onClose={() => setIsRenameDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Rename Workflow</DialogTitle>
        <DialogContent>
          <TextField
            label="Workflow Name"
            value={newWorkflowName}
            onChange={(e) => setNewWorkflowName(e.target.value)}
            fullWidth
            autoFocus
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setIsRenameDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleRenameWorkflow} disabled={!newWorkflowName.trim()} variant="contained">
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Workflow?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently delete the workflow and all of its connections.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setIsDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDeleteWorkflow}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
