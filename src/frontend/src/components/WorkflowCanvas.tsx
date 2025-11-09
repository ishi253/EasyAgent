import { useState, useRef } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LinkIcon from '@mui/icons-material/Link';
import { WorkflowNode, Connection, Agent } from '../App';
import { WorkflowNodeComponent } from './WorkflowNodeComponent';
import { ConnectionLine } from './ConnectionLine';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  connections: Connection[];
  agents: Agent[];
  onUpdateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  onConnect: (sourceId: string, targetId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteConnection: (connectionId: string) => void;
  isConnectionMode: boolean;
  onExitConnectionMode: () => void;
}

export function WorkflowCanvas({
  nodes,
  connections,
  agents,
  onUpdateNodePosition,
  onConnect,
  onDeleteNode,
  onDeleteConnection,
  isConnectionMode,
  onExitConnectionMode,
}: WorkflowCanvasProps) {
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleNodeClick = (nodeId: string) => {
    if (!isConnectionMode) return;
    
    if (connectingFrom === null) {
      // First node selected
      setConnectingFrom(nodeId);
    } else if (connectingFrom === nodeId) {
      // Clicked same node, cancel
      setConnectingFrom(null);
    } else {
      // Second node selected, create connection
      onConnect(connectingFrom, nodeId);
      setConnectingFrom(null);
      onExitConnectionMode();
    }
  };

  const handleStartConnection = (nodeId: string) => {
    setConnectingFrom(nodeId);
  };

  const handleEndConnection = (nodeId: string) => {
    if (connectingFrom && connectingFrom !== nodeId) {
      onConnect(connectingFrom, nodeId);
    }
    setConnectingFrom(null);
  };

  if (nodes.length === 0) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100%"
        bgcolor="rgba(15,23,42,0.02)"
      >
        <Stack textAlign="center" alignItems="center" spacing={2}>
          <Box
            width={72}
            height={72}
            borderRadius="50%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bgcolor="rgba(99,102,241,0.1)"
          >
            <AddCircleOutlineIcon fontSize="large" color="primary" />
          </Box>
          <Typography variant="h6">No agents in workflow</Typography>
          <Typography variant="body2" color="text.secondary">
            Select agents from the library to start building your automation.
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      ref={canvasRef}
      position="relative"
      width="100%"
      height="100%"
      overflow="auto"
      sx={{
        backgroundColor: 'rgba(15,23,42,0.02)',
        backgroundImage:
          'linear-gradient(to right, rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.2) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {isConnectionMode && (
        <Paper
          elevation={6}
          sx={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            px: 3,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: 'primary.main',
            color: '#fff',
          }}
        >
          <LinkIcon fontSize="small" />
          <Typography variant="body2">
            {connectingFrom
              ? 'Select a target node to complete the connection'
              : 'Select a source node to begin linking' }
          </Typography>
          <Button
            size="small"
            color="inherit"
            variant="outlined"
            onClick={() => {
              setConnectingFrom(null);
              onExitConnectionMode();
            }}
            sx={{ borderColor: 'rgba(255,255,255,0.5)' }}
          >
            Cancel
          </Button>
        </Paper>
      )}

      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
      >
        {connections.map(conn => {
          const sourceNode = nodes.find(n => n.id === conn.sourceId);
          const targetNode = nodes.find(n => n.id === conn.targetId);
          if (!sourceNode || !targetNode) return null;

          return (
            <ConnectionLine
              key={conn.id}
              id={conn.id}
              sourceX={sourceNode.position.x + 150}
              sourceY={sourceNode.position.y + 50}
              targetX={targetNode.position.x}
              targetY={targetNode.position.y + 50}
              isActive={conn.isActive}
              onDelete={onDeleteConnection}
            />
          );
        })}
      </svg>

      {nodes.map(node => {
        const agent = agents.find(a => a.id === node.agentId);
        if (!agent) return null;

        return (
          <WorkflowNodeComponent
            key={node.id}
            node={node}
            agent={agent}
            onUpdatePosition={onUpdateNodePosition}
            onDelete={onDeleteNode}
            isConnectionMode={isConnectionMode}
            isConnecting={connectingFrom === node.id}
            onNodeClick={handleNodeClick}
          />
        );
      })}
    </Box>
  );
}
