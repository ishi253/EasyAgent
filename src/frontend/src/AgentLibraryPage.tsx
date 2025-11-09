import { useState } from 'react';
import { Agent } from '../App';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Search, Sparkles } from 'lucide-react';
import { AgentDetailPanel } from './AgentDetailPanel';

interface AgentLibraryPageProps {
  agents: Agent[];
}

export function AgentLibraryPage({ agents }: AgentLibraryPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedAgent = agents.find(agent => agent.id === selectedAgentId) || null;

  return (
    <div className="flex-1 flex overflow-hidden">
      
      {/* Main content area (Grid) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with search */}
        <div className="p-6 border-b border-slate-200 bg-white">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Agent Library</h2>
          <p className="text-slate-600 mb-4">
            Browse, search, and manage all available AI agents.
          </p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Grid of "Boxes" */}
        <div className="flex-1 overflow-y-hidden p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredAgents.map((agent) => (
            <Card
              key={agent.id}
              // --- MODIFIED ---
              // Made it a fixed-size square (h-36 w-36)
              // Kept flex-col and justify-center
              className="p-4 flex flex-col items-center justify-center cursor-pointer h-36 w-36 hover:shadow-md hover:border-blue-500 transition-all"
              onClick={() => setSelectedAgentId(agent.id)}
            >
              {/* --- MODIFIED --- */}
              {/* Made icon container bigger (w-14 h-14) */}
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0 mb-3">
                {/* --- MODIFIED --- */}
                {/* Made icon bigger (w-7 h-7) */}
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              
              {/* --- MODIFIED --- */}
              {/* Added mt-auto to push text down, and centered it */}
              <div className="text-center">
                <h4 className="text-slate-900 font-semibold truncate w-full">{agent.name}</h4>
                <p className="text-slate-500 text-sm">{agent.category}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      <div className={`
        transition-all duration-300 ease-in-out bg-white border-l border-slate-200 overflow-hidden
        ${selectedAgent ? 'w-96' : 'w-0'}
      `}>
        <AgentDetailPanel 
          agent={selectedAgent} 
          onClose={() => setSelectedAgentId(null)}
        />
      </div>

    </div>
  );
}