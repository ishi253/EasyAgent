import { Agent } from '../App';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Search, Sparkles, Plus } from 'lucide-react'; // Plus stays only as an icon in cards
import { useState } from 'react';

interface AgentSidebarProps {
  agents: Agent[];
  onAddNode: (agentId: string) => void;
}

export function AgentSidebar({ agents, onAddNode }: AgentSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-900">Agent Library</h3>
          {/* removed New button */}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredAgents.map((agent) => (
          <Card
            key={agent.id}
            className="p-3 cursor-pointer hover:shadow-md hover:border-blue-500 transition-all group"
            onClick={() => onAddNode(agent.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-slate-900">{agent.name}</h4>
                  <p className="text-slate-500">{agent.category}</p>
                </div>
              </div>
              <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <p className="text-slate-600 line-clamp-2">{agent.description}</p>
          </Card>
        ))}
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <p className="text-slate-600 mb-2">💡 Click an agent to add it to the canvas</p>
        <p className="text-slate-500">Connect agents to create data streaming workflows</p>
      </div>
    </div>
  );
}
