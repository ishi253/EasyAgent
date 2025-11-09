import { useState, useRef } from 'react';
import { WorkflowNode, Connection, Agent } from '../App';
import { WorkflowNodeComponent } from './WorkflowNodeComponent';
import { ConnectionLine } from './ConnectionLine';
import { Plus, Link2 } from 'lucide-react';
import { Button } from './ui/button';

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
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-200 mb-4">
            <Plus className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-slate-900 mb-2">No agents in workflow</h3>
          <p className="text-slate-600">
            Drag agents from the sidebar to build your workflow
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full bg-slate-50 overflow-auto"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgb(226 232 240 / 0.5) 1px, transparent 1px),
          linear-gradient(to bottom, rgb(226 232 240 / 0.5) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }}
    >
      {/* Connection mode banner */}
      {isConnectionMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <Link2 className="w-5 h-5" />
          <span>
            {connectingFrom 
              ? 'Click on the target agent to complete the connection' 
              : 'Click on the source agent to start'}
          </span>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => {
              setConnectingFrom(null);
              onExitConnectionMode();
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Render connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
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

      {/* Render nodes */}
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
    </div>
  );
}