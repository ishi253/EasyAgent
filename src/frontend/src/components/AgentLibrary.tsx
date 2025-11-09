import { Agent } from '../App';
import { AgentCard } from './AgentCard';

interface AgentLibraryProps {
  agents: Agent[];
  onUpdateAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
}

export function AgentLibrary({ agents, onUpdateAgent, onDeleteAgent }: AgentLibraryProps) {
  if (agents.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-200 mb-4">
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <h3 className="text-slate-900 mb-2">No agents found</h3>
        <p className="text-slate-600">
          Create your first agent to get started with your workflow automation
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          onUpdate={onUpdateAgent}
          onDelete={onDeleteAgent}
        />
      ))}
    </div>
  );
}
