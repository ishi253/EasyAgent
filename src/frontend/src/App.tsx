import { useMemo, useState } from 'react';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { AgentSidebar } from './components/AgentSidebar';
import { StreamingPanel } from './components/StreamingPanel';
import { WorkflowTabs } from './components/WorkflowTabs';
import { Button } from './components/ui/button';
import { Play, Square, Link2 } from 'lucide-react';
import { AgentLibraryPage } from './AgentLibraryPage';

// --- INTERFACES ---
export interface Agent {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNode {
  id: string;
  agentId: string;
  position: { x: number; y: number };
  status: 'idle' | 'processing' | 'complete' | 'error';
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  isActive?: boolean;
}

export interface StreamMessage {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  content: string;
  timestamp: number;
  status: 'streaming' | 'complete';
  outputType?: string;
  outputStatus?: 'success' | 'error';
  isOutput?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  context: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}

// --- MAIN APP COMPONENT ---
export default function App() {
  // Agents state lives here. Creation happens only via AgentLibraryPage.
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: '1',
      name: 'Research Agent',
      description: 'Gathers and analyzes information',
      prompt:
        'You are a research specialist. Analyze the input and extract key insights, facts, and relevant information. Present findings in a structured format.',
      category: 'Research',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '5',
      name: 'Data Analyst Agent',
      description: 'Analyzes datasets to find trends and insights.',
      prompt:
        'You are a data analyst. Given a dataset (CSV or JSON), perform statistical analysis, identify key trends, and return a summary of your findings.',
      category: 'Data',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '6',
      name: 'Task Prioritizer',
      description: 'Organizes a list of tasks based on priority.',
      prompt:
        'You are an expert project manager. Take the following list of tasks and organize them by priority (high, medium, low) and logical order of completion. Return the prioritized list.',
      category: 'Planning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Code Generator',
      description: 'Generates code from specifications',
      prompt:
        'You are a senior software engineer. Convert specifications and requirements into clean, well-documented code following best practices.',
      category: 'Development',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: 'workflow-1',
      name: 'Content Pipeline',
      context: 'General',
      nodes: [],
      connections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);


  const [currentWorkflowId, setCurrentWorkflowId] = useState('workflow-1');
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isConnectionMode, setIsConnectionMode] = useState(false);
  const [currentPage, setCurrentPage] = useState<'workflow' | 'library'>('library');

  const currentWorkflow =
    workflows.find((w) => w.id === currentWorkflowId) || workflows[0];
  const nodes = currentWorkflow?.nodes || [];
  const connections = currentWorkflow?.connections || [];

  const availableAgents = useMemo(
  () => agents.filter(a => !nodes.some(n => n.agentId === a.id)),
  [agents, nodes]
);

  // Helpers
  const updateCurrentWorkflow = (updates: Partial<Workflow>) => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === currentWorkflowId ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
      )
    );
  };

  // Workflow CRUD
  const handleCreateWorkflow = (name: string, context: string) => {
    const newWorkflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name,
      context,
      nodes: [],
      connections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWorkflows((prev) => [...prev, newWorkflow]);
    setCurrentWorkflowId(newWorkflow.id);
  };

  const handleRenameWorkflow = (workflowId: string, newName: string) => {
    setWorkflows((prev) =>
      prev.map((w) => (w.id === workflowId ? { ...w, name: newName, updatedAt: new Date().toISOString() } : w))
    );
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
    if (currentWorkflowId === workflowId) {
      const next = workflows.find((w) => w.id !== workflowId);
      if (next) setCurrentWorkflowId(next.id);
    }
  };

  const handleDuplicateWorkflow = (workflowId: string) => {
    const w = workflows.find((x) => x.id === workflowId);
    if (!w) return;
    const copy: Workflow = {
      ...w,
      id: `workflow-${Date.now()}`,
      name: `${w.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWorkflows((prev) => [...prev, copy]);
    setCurrentWorkflowId(copy.id);
  };

  // Agent creation lives only here, invoked by AgentLibraryPage
  const handleCreateAgent = (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAgent: Agent = {
      ...agent,
      id: Date.now().toString(), //FIX THIS
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAgents((prev) => [...prev, newAgent]);
  };

  // Canvas actions
  const handleAddNode = (agentId: string) => {
    if (nodes.some(n => n.agentId === agentId)) return;

    //const newId = `${agentId}-1`;

    updateCurrentWorkflow({
      nodes: [
        ...nodes,
        {
          id: agentId ,
          agentId,
          position: { x: 100 + nodes.length * 50, y: 100 + nodes.length * 30 },
          status: 'idle',
        },
      ],
    });
  };

  const handleUpdateNodePosition = (nodeId: string, position: { x: number; y: number }) => {
    updateCurrentWorkflow({
      nodes: nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
    });
  };

  const handleConnect = (sourceId: string, targetId: string) => {
    const exists = connections.some((c) => c.sourceId === sourceId && c.targetId === targetId);
    if (!exists) {
      updateCurrentWorkflow({
        connections: [...connections, { id: `conn-${Date.now()}`, sourceId, targetId }],
      });
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    updateCurrentWorkflow({
      nodes: nodes.filter((n) => n.id !== nodeId),
      connections: connections.filter((c) => c.sourceId !== nodeId && c.targetId !== nodeId),
    });
  };

  const handleDeleteConnection = (connectionId: string) => {
    updateCurrentWorkflow({
      connections: connections.filter((c) => c.id !== connectionId),
    });
  };

  const getFormattedWorkflowData = () => {
    const cw = workflows.find((w) => w.id === currentWorkflowId);
    if (!cw) return null;
    return {
      workflow: cw.id,
      context: cw.context,
      nodes: cw.nodes.map((n) => n.id),
      edges: cw.connections.map((c) => [c.sourceId, c.targetId]),
    };
  };

  const simulateStreaming = async (nodeId: string, input: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    const agent = agents.find((a) => a.id === node?.agentId);
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    return `[Processed by ${agent?.name}]\n${input}\n\n✓ Analysis complete with enhanced insights and refinements.`;
  };

  const getOutputTypeForAgent = (agentName: string): string => {
    const name = agentName.toLowerCase();
    if (name.includes('code') || name.includes('developer')) return '.py';
    if (name.includes('writer') || name.includes('content') || name.includes('editor')) return '.txt';
    if (name.includes('video') || name.includes('media')) return '.mp4';
    if (name.includes('image') || name.includes('design')) return '.png';
    if (name.includes('data') || name.includes('analyst')) return '.csv';
    if (name.includes('document') || name.includes('report')) return '.pdf';
    return '.txt';
  };

  const handleRunWorkflow = async () => {
    console.log('Workflow data to send:', getFormattedWorkflowData());
    if (nodes.length === 0 || connections.length === 0) return;

    setIsRunning(true);
    setMessages([]);
    updateCurrentWorkflow({ nodes: nodes.map((n) => ({ ...n, status: 'idle' as const })) });

    let currentData = 'Initial workflow input: Process this data through the agent pipeline.';

    for (const connection of connections) {
      const sourceNode = nodes.find((n) => n.id === connection.sourceId);
      const targetNode = nodes.find((n) => n.id === connection.targetId);
      if (!sourceNode || !targetNode) continue;

      updateCurrentWorkflow({
        nodes: nodes.map((n) => (n.id === sourceNode.id ? { ...n, status: 'processing' as const } : n)),
      });
      const processedData = await simulateStreaming(sourceNode.id, currentData);
      updateCurrentWorkflow({
        nodes: nodes.map((n) => (n.id === sourceNode.id ? { ...n, status: 'complete' as const } : n)),
      });
      updateCurrentWorkflow({
        connections: connections.map((c) => (c.id === connection.id ? { ...c, isActive: true } : c)),
      });

      const message: StreamMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        fromNodeId: sourceNode.id,
        toNodeId: targetNode.id,
        content: processedData,
        timestamp: Date.now(),
        status: 'streaming',
        outputType: getOutputTypeForAgent(sourceNode.agentId),
      };
      setMessages((prev) => [...prev, message]);

      await new Promise((r) => setTimeout(r, 800));
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, status: 'complete' } : m)));

      updateCurrentWorkflow({
        nodes: nodes.map((n) => (n.id === targetNode.id ? { ...n, status: 'processing' as const } : n)),
      });
      currentData = await simulateStreaming(targetNode.id, processedData);
      updateCurrentWorkflow({
        nodes: nodes.map((n) => (n.id === targetNode.id ? { ...n, status: 'complete' as const } : n)),
      });
      updateCurrentWorkflow({
        connections: connections.map((c) => (c.id === connection.id ? { ...c, isActive: false } : c)),
      });

      await new Promise((r) => setTimeout(r, 300));
    }

    const lastConnection = connections[connections.length - 1];
    const lastNode = nodes.find((n) => n.id === lastConnection.targetId);
    const lastAgent = agents.find((a) => a.id === lastNode?.agentId);

    const outputMessage: StreamMessage = {
      id: `output-${Date.now()}`,
      fromNodeId: lastNode?.id || '',
      toNodeId: '',
      content: currentData,
      timestamp: Date.now(),
      status: 'complete',
      outputType: lastAgent ? getOutputTypeForAgent(lastAgent.name) : '.txt',
      outputStatus: 'success',
      isOutput: true,
    };
    setMessages((prev) => [...prev, outputMessage]);
    setIsRunning(false);
  };

  const handleStopWorkflow = () => {
    setIsRunning(false);
    updateCurrentWorkflow({
      nodes: nodes.map((n) => ({ ...n, status: 'idle' as const })),
      connections: connections.map((c) => ({ ...c, isActive: false })),
    });
  };

  const handleClearWorkflow = () => {
    updateCurrentWorkflow({ nodes: [], connections: [] });
    setMessages([]);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="mb-1">Agent Workflow Studio</h1>
            <div className="flex items-center gap-2">
              <Button
                variant={currentPage === 'library' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage('library')}
              >
                Agent Library
              </Button>
              <Button
                variant={currentPage === 'workflow' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage('workflow')}
              >
                Workflow Studio
              </Button>
            </div>
          </div>

          {currentPage === 'workflow' && (
            <div className="flex items-center gap-3">
              <Button
                variant={isConnectionMode ? 'default' : 'outline'}
                onClick={() => setIsConnectionMode(!isConnectionMode)}
                disabled={isRunning || nodes.length < 2}
                className="gap-2"
              >
                <Link2 className="w-4 h-4" />
                {isConnectionMode ? 'Connecting...' : 'Add Connection'}
              </Button>
              <Button
                variant="outline"
                onClick={handleClearWorkflow}
                disabled={isRunning || nodes.length === 0}
              >
                Clear Canvas
              </Button>
              {isRunning ? (
                <Button onClick={handleStopWorkflow} variant="destructive" className="gap-2">
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
              ) : (
                <Button onClick={handleRunWorkflow} disabled={nodes.length === 0} className="gap-2">
                  <Play className="w-4 h-4" />
                  Run Workflow
                </Button>
              )}
            </div>
          )}
        </div>

        {currentPage === 'workflow' && (
          <WorkflowTabs
            workflows={workflows}
            currentWorkflowId={currentWorkflowId}
            onSelectWorkflow={setCurrentWorkflowId}
            onCreateWorkflow={handleCreateWorkflow}
            onRenameWorkflow={handleRenameWorkflow}
            onDeleteWorkflow={handleDeleteWorkflow}
            onDuplicateWorkflow={handleDuplicateWorkflow}
          />
        )}
      </div>

      {/* Main Content */}
      {currentPage === 'workflow' ? (
        <div className="flex-1 flex overflow-hidden">
          <AgentSidebar
            agents={availableAgents}
            onAddNode={handleAddNode}
            // No creation props here. Sidebar cannot create agents.
          />
          <div className="flex-1 overflow-hidden">
            <WorkflowCanvas
              nodes={nodes}
              connections={connections}
              agents={agents}
              onUpdateNodePosition={handleUpdateNodePosition}
              onConnect={handleConnect}
              onDeleteNode={handleDeleteNode}
              onDeleteConnection={handleDeleteConnection}
              isConnectionMode={isConnectionMode}
              onExitConnectionMode={() => setIsConnectionMode(false)}
            />
          </div>
          <StreamingPanel messages={messages} nodes={nodes} agents={agents} connections={connections} />
        </div>
      ) : (
        // Creation lives only here
        <AgentLibraryPage agents={agents} onCreateAgent={handleCreateAgent} />
      )}
    </div>
  );
}
