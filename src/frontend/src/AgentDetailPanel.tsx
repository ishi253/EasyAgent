import { Agent } from '../App';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { X, Sparkles } from 'lucide-react';

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
    // Fixed width so the panel content doesn't collapse during animation
    <div className="flex flex-col h-full w-96">
      
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Agent Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Agent Info Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-900">{agent.name}</h4>
            <Badge variant="secondary">{agent.category}</Badge>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-slate-500">Description</label>
          <p className="text-slate-700 mt-1">{agent.description}</p>
        </div>

        {/* System Prompt */}
        <div>
          <label className="text-sm font-medium text-slate-500">System Prompt</label>
          <blockquote className="mt-1 p-4 bg-slate-50 border-l-4 border-slate-300 text-slate-600 rounded-md whitespace-pre-wrap">
            {agent.prompt}
          </blockquote>
        </div>
        
      </div>
    </div>
  );
}