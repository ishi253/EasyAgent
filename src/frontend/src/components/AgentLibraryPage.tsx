import { useMemo, useState } from 'react';
import { Agent } from '../App';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { CreateAgentDialog } from './CreateAgentDialog';
import { AgentDetailPanel } from './AgentDetailPanel';

interface AgentLibraryPageProps {
  agents: Agent[];
  onCreateAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function AgentLibraryPage({ agents, onCreateAgent }: AgentLibraryPageProps) {
  const [open, setOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const sortedAgents = useMemo(
    () =>
      [...agents].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [agents]
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="px-6 pt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-center flex">Agent Library</h2>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Agent
        </Button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 px-6 pb-6 mt-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {sortedAgents.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl p-10 text-slate-600 text-center">
            <p className="font-medium mb-1">No agents yet</p>
            <p>
              Click <span className="font-semibold">New Agent</span> to create one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
            {sortedAgents.map((a) => {
              const active = a.id === selectedAgentId;
              return (
                <div key={a.id} className="space-y-2">
                  <button
                    onClick={() => setSelectedAgentId(active ? null : a.id)}
                    className={`w-full border rounded-xl p-4 bg-white transition-all hover:shadow-sm focus:outline-none
                      ${active ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'}`}
                    aria-pressed={active}
                  >
                    <div className="flex flex-col items-center mb-2">
                      <div className="font-medium text-slate-900">{a.name}</div>
                      <div className="text-xs text-slate-500">{a.category}</div>

                    </div>

                    {/* Centered description */}
                    <p className="text-sm text-slate-700 mt-2 line-clamp-3 text-center">
                      {a.description}
                    </p>
                  </button>

                  {/* Inline detail panel below the card */}
                  {active && (
                    <div className="border border-blue-200 rounded-lg bg-white p-4 shadow-sm text-center">
                      <AgentDetailPanel agent={a} onClose={() => setSelectedAgentId(null)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <CreateAgentDialog
        open={open}
        onOpenChange={setOpen}
        onCreateAgent={(agent) => {
          onCreateAgent(agent);
          setOpen(false);
        }}
      />
    </div>
  );
}
