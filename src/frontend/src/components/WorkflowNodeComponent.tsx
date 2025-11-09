import { useRef, useState, useEffect } from 'react';
import { WorkflowNode, Agent } from '../App';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Trash2, Circle, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

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

  const getStatusIcon = () => {
    switch (node.status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = () => {
    switch (node.status) {
      case 'processing':
        return 'border-blue-500 shadow-lg shadow-blue-500/20';
      case 'complete':
        return 'border-green-500 shadow-lg shadow-green-500/20';
      case 'error':
        return 'border-red-500 shadow-lg shadow-red-500/20';
      default:
        return 'border-slate-200';
    }
  };

  const getCursorStyle = () => {
    if (isConnectionMode) return 'cursor-pointer';
    return 'cursor-move';
  };

  return (
    <div
      ref={nodeRef}
      className="absolute"
      style={{
        left: node.position.x,
        top: node.position.y,
        zIndex: 10,
        width: 300,
      }}
    >
      <Card
        className={`${getCursorStyle()} transition-all ${getStatusColor()} ${
          isDragging ? 'opacity-80' : ''
        } ${isConnecting ? 'ring-4 ring-blue-500 ring-offset-2' : ''} ${
          isConnectionMode ? 'hover:ring-2 hover:ring-blue-400' : ''
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon()}
                <h4 className="text-slate-900">{agent.name}</h4>
              </div>
              <Badge variant="secondary" className="text-xs">
                {agent.category}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
          
          <p className="text-slate-600 mb-3">{agent.description}</p>
          
          <div className="flex items-center justify-center">
            <div className="text-center text-slate-500">
              {node.status === 'processing' && 'Processing...'}
              {node.status === 'complete' && 'Complete'}
              {node.status === 'idle' && 'Ready'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}