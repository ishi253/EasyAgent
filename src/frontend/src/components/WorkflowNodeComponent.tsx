import { useRef, useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { WorkflowNode, Agent } from '../App';

interface WorkflowNodeComponentProps {
  node: WorkflowNode;
  agent: Agent;
  onUpdatePosition: (nodeId: string, position: { x: number; y: number }) => void;
  onDelete: (nodeId: string) => void;
  isConnectionMode: boolean;
  isConnecting: boolean;
  onNodeClick: (nodeId: string) => void;
}

export function WorkflowNodeComponent({
  node,
  agent,
  onUpdatePosition,
  onDelete,
  isConnectionMode,
  isConnecting,
  onNodeClick,
}: WorkflowNodeComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    if (isConnectionMode) {
      onNodeClick(node.id);
      return;
    }
    
    setIsDragging(true);
    const rect = nodeRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const canvas = nodeRef.current?.parentElement;
    if (!canvas) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    const newX = e.clientX - canvasRect.left - dragOffset.x + canvas.scrollLeft;
    const newY = e.clientY - canvasRect.top - dragOffset.y + canvas.scrollTop;
    
    onUpdatePosition(node.id, { x: Math.max(0, newX), y: Math.max(0, newY) });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const statusStyles = {
    idle: {
      borderColor: 'divider',
      shadow: '0 8px 20px rgba(15,23,42,0.08)',
      color: 'text.secondary',
    },
    processing: {
      borderColor: 'primary.main',
      shadow: '0 12px 25px rgba(37,99,235,0.25)',
      color: 'primary.main',
    },
    complete: {
      borderColor: 'success.main',
      shadow: '0 12px 25px rgba(34,197,94,0.25)',
      color: 'success.main',
    },
    error: {
      borderColor: 'error.main',
      shadow: '0 12px 25px rgba(239,68,68,0.25)',
      color: 'error.main',
    },
  } as const;

  const renderStatusIcon = () => {
    switch (node.status) {
      case 'processing':
        return <CircularProgress size={20} thickness={6} color="inherit" />;
      case 'complete':
        return <CheckCircleIcon fontSize="small" />;
      case 'error':
        return <ErrorOutlineIcon fontSize="small" />;
      default:
        return <RadioButtonUncheckedIcon fontSize="small" />;
    }
  };

  return (
    <Box
      ref={nodeRef}
      sx={{
        position: 'absolute',
        left: node.position.x,
        top: node.position.y,
        width: 320,
        zIndex: 10,
      }}
    >
      <Card
        elevation={isConnecting ? 8 : 4}
        onMouseDown={handleMouseDown}
        sx={{
          border: '2px solid',
          borderColor: statusStyles[node.status].borderColor,
          boxShadow: statusStyles[node.status].shadow,
          cursor: isConnectionMode ? 'pointer' : 'grab',
          opacity: isDragging ? 0.8 : 1,
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
          transform: isConnecting ? 'translateY(-2px)' : 'none',
          position: 'relative',
        }}
      >
        {isConnecting && (
          <Box
            sx={{
              position: 'absolute',
              inset: -6,
              borderRadius: 3,
              border: '2px solid',
              borderColor: 'primary.light',
              pointerEvents: 'none',
            }}
          />
        )}
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} mb={2}>
            <Box flex={1} minWidth={0}>
              <Stack direction="row" spacing={1} alignItems="center" color={statusStyles[node.status].color} mb={0.5}>
                {renderStatusIcon()}
                <Typography variant="subtitle1" color="text.primary" fontWeight={600}>
                  {agent.name}
                </Typography>
              </Stack>
              <Chip label={agent.category} size="small" color="secondary" variant="outlined" />
            </Box>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
            >
              <DeleteOutlineIcon fontSize="small" color="error" />
            </IconButton>
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {agent.description}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {node.status === 'processing' && 'Processing…'}
            {node.status === 'complete' && 'Complete'}
            {node.status === 'idle' && 'Ready'}
            {node.status === 'error' && 'Needs Attention'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
