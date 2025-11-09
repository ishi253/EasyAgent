import { useState } from 'react';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { AgentSidebar } from './components/AgentSidebar';
import { StreamingPanel } from './components/StreamingPanel';
import { WorkflowTabs } from './components/WorkflowTabs';
import { Button } from './components/ui/button';
import { Play, Square, Link2 } from 'lucide-react';
import { CreateAgentDialog } from './components/CreateAgentDialog';

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
  nodes: WorkflowNode[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: '1',
      name: 'Research Agent',
      description: 'Gathers and analyzes information',
      prompt: 'You are a research specialist. Analyze the input and extract key insights, facts, and relevant information. Present findings in a structured format.',
      category: 'Research',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '5',
      name: 'Data Analyst Agent',
      description: 'Analyzes datasets to find trends and insights.',
      prompt: 'You are a data analyst. Given a dataset (CSV or JSON), perform statistical analysis, identify key trends, and return a summary of your findings.',
      category: 'Data',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '6',
      name: 'Task Prioritizer',
      description: 'Organizes a list of tasks based on priority.',
      prompt: 'You are an expert project manager. Take the following list of tasks and organize them by priority (high, medium, low) and logical order of completion. Return the prioritized list.',
      category: 'Planning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Code Generator',
      description: 'Generates code from specifications',
      prompt: 'You are a senior software engineer. Convert specifications and requirements into clean, well-documented code following best practices.',
      category: 'Development',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: 'workflow-1',
      name: 'Content Pipeline',
      nodes: [],
      connections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const [currentWorkflowId, setCurrentWorkflowId] = useState('workflow-1');
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConnectionMode, setIsConnectionMode] = useState(false);

  const currentWorkflow = workflows.find(w => w.id === currentWorkflowId) || workflows[0];
  const nodes = currentWorkflow?.nodes || [];
  const connections = currentWorkflow?.connections || [];

  const updateCurrentWorkflow = (updates: Partial<Workflow>) => {
    setWorkflows(workflows.map(w => 
      w.id === currentWorkflowId 
        ? { ...w, ...updates, updatedAt: new Date().toISOString() }
        : w
    ));
  };

  const handleCreateWorkflow = (name: string) => {
    const newWorkflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name,
      nodes: [],
      connections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWorkflows([...workflows, newWorkflow]);
    setCurrentWorkflowId(newWorkflow.id);
  };

  const handleRenameWorkflow = (workflowId: string, newName: string) => {
    setWorkflows(workflows.map(w => 
      w.id === workflowId 
        ? { ...w, name: newName, updatedAt: new Date().toISOString() }
        : w
    ));
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    const updatedWorkflows = workflows.filter(w => w.id !== workflowId);
    setWorkflows(updatedWorkflows);
    
    if (currentWorkflowId === workflowId && updatedWorkflows.length > 0) {
      setCurrentWorkflowId(updatedWorkflows[0].id);
    }
  };

  const handleDuplicateWorkflow = (workflowId: string) => {
    const workflowToDuplicate = workflows.find(w => w.id === workflowId);
    if (!workflowToDuplicate) return;

    const newWorkflow: Workflow = {
      ...workflowToDuplicate,
      id: `workflow-${Date.now()}`,
      name: `${workflowToDuplicate.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWorkflows([...workflows, newWorkflow]);
    setCurrentWorkflowId(newWorkflow.id);
  };

  const handleCreateAgent = (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAgent: Agent = {
      ...agent,
      id: Date.now().toString(), // NEED TO CHANGE ALL OF THIS TODO****//
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAgents([...agents, newAgent]);
    setIsCreateDialogOpen(false);
  };

  const handleAddNode = (agentId: string) => {
    
    // --- New ID Logic ---
    // 1. Get all nodes that already use this agentId
    const nodesOfThisType = nodes.filter(node => node.agentId === agentId);

    // 2. Find the highest instance number already used
    const instanceNumbers = nodesOfThisType.map(node => {
      const parts = node.id.split('-');
      // Get the last part of the ID (the instance number)
      return parseInt(parts[parts.length - 1], 10);
    }).filter(num => !isNaN(num)); // Filter out any that aren't numbers

    // 3. Find the max number, or 0 if none exist
    const maxInstance = instanceNumbers.length > 0 ? Math.max(...instanceNumbers) : 0;

    // 4. The new instance number is the next one
    const newInstanceNumber = maxInstance + 1;

    // 5. Create the new ID (e.g., "3-2")
    const newId = `${agentId}-${newInstanceNumber}`;
    // --- End New ID Logic ---

    const newNode: WorkflowNode = {
      id: newId, // <-- Use the new ID
      agentId,
      position: { x: 100 + nodes.length * 50, y: 100 + nodes.length * 30 },
      status: 'idle',
    };
    
    updateCurrentWorkflow({ nodes: [...nodes, newNode] });
  };

  
  const handleUpdateNodePosition = (nodeId: string, position: { x: number; y: number }) => {
    updateCurrentWorkflow({
      nodes: nodes.map(node => 
        node.id === nodeId ? { ...node, position } : node
      )
    });
  };

  const handleConnect = (sourceId: string, targetId: string) => {
    const connectionExists = connections.some(
      c => c.sourceId === sourceId && c.targetId === targetId
    );
    if (!connectionExists) {
      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        sourceId,
        targetId,
      };
      updateCurrentWorkflow({ connections: [...connections, newConnection] });
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    updateCurrentWorkflow({
      nodes: nodes.filter(n => n.id !== nodeId),
      connections: connections.filter(c => c.sourceId !== nodeId && c.targetId !== nodeId)
    });
  };

  const handleDeleteConnection = (connectionId: string) => {
    updateCurrentWorkflow({
      connections: connections.filter(c => c.id !== connectionId)
    });
  };

  // --- ADDED ---
  /**
   * Gathers the current workflow's nodes and edges
   * and formats them for the backend.
   */
const getFormattedWorkflowData = () => {
    // 1. Find the current workflow object from state
    const currentWorkflow = workflows.find(w => w.id === currentWorkflowId);

    if (!currentWorkflow) {
      console.error("Could not find the current workflow.");
      return null;
    }

    // 2. Get the "list for nodes"
    const nodesList = currentWorkflow.nodes.map(node => node.id);

    // 3. Get the "list of tuples for edges"
    const edgesList = currentWorkflow.connections.map(conn => [conn.sourceId, conn.targetId]);

    // 4. Get the "workflow" (ID)
    const workflowId = currentWorkflow.id;

    // --- Here is the output you requested ---
    console.log("Nodes List:", nodesList);
    console.log("Edges List:", edgesList);
    console.log("Workflow ID:", workflowId);
    // ----------------------------------------

    // 5. Create the final payload object with just those three items
    const payload = {
      workflow: workflowId,
      nodes: nodesList,
      edges: edgesList,
    };
    
    // This return value is what gets used by the console.log in handleRunWorkflow
    return payload;
  };

  const simulateStreaming = async (nodeId: string, input: string): Promise<string> => {
    // ... (rest of function) ...
    const node = nodes.find(n => n.id === nodeId);
    const agent = agents.find(a => a.id === node?.agentId);
    
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    return `[Processed by ${agent?.name}]\n${input}\n\n✓ Analysis complete with enhanced insights and refinements.`;
  };

  const getOutputTypeForAgent = (agentName: string): string => {
    // ... (rest of function) ...
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
    
    // --- ADDED ---
    // Log the formatted data to the console
    const workflowData = getFormattedWorkflowData();
    console.log("Workflow data to send:", workflowData);
    // You can now send this `workflowData` object to your backend here.
    // -------------

    if (nodes.length === 0 || connections.length === 0) return;
    
    setIsRunning(true);
    setMessages([]);
    
    // Reset all nodes to idle
    updateCurrentWorkflow({
      nodes: nodes.map(n => ({ ...n, status: 'idle' as const }))
    });
    
    // Process connections in the order they were added
    let currentData = "Initial workflow input: Process this data through the agent pipeline.";
    
    for (const connection of connections) {
      const sourceNode = nodes.find(n => n.id === connection.sourceId);
      const targetNode = nodes.find(n => n.id === connection.targetId);
      
      if (!sourceNode || !targetNode) continue;
      
      // Set source node to processing
      updateCurrentWorkflow({
        nodes: nodes.map(n => 
          n.id === sourceNode.id ? { ...n, status: 'processing' as const } : n
        )
      });
      
      // Process through source node
      const processedData = await simulateStreaming(sourceNode.id, currentData);
      
      // Mark source node as complete
      updateCurrentWorkflow({
        nodes: nodes.map(n => 
          n.id === sourceNode.id ? { ...n, status: 'complete' as const } : n
        )
      });
      
      // Activate connection
      updateCurrentWorkflow({
        connections: connections.map(c => 
          c.id === connection.id ? { ...c, isActive: true } : c
        )
      });
      
      // Add streaming message
      const message: StreamMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        fromNodeId: sourceNode.id,
        toNodeId: targetNode.id,
        content: processedData,
        timestamp: Date.now(),
        status: 'streaming',
        outputType: getOutputTypeForAgent(sourceNode.agentId),
      };
      setMessages(prev => [...prev, message]);
      
      // Wait for streaming animation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mark message as complete
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, status: 'complete' } : m
      ));
      
      // Set target node to processing
      updateCurrentWorkflow({
        nodes: nodes.map(n => 
          n.id === targetNode.id ? { ...n, status: 'processing' as const } : n
        )
      });
      
      // Process through target node
      currentData = await simulateStreaming(targetNode.id, processedData);
      
      // Mark target node as complete
      updateCurrentWorkflow({
        nodes: nodes.map(n => 
          n.id === targetNode.id ? { ...n, status: 'complete' as const } : n
        )
      });
      
      // Deactivate connection
      updateCurrentWorkflow({
        connections: connections.map(c => 
          c.id === connection.id ? { ...c, isActive: false } : c
        )
      });
      
      // Small pause between connections
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Generate final output after all connections complete
    const lastConnection = connections[connections.length - 1];
    const lastNode = nodes.find(n => n.id === lastConnection.targetId);
    const lastAgent = agents.find(a => a.id === lastNode?.agentId);
    
    // Add final output message
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
    setMessages(prev => [...prev, outputMessage]);
    
    setIsRunning(false);
  };

  const handleStopWorkflow = () => {
    setIsRunning(false);
    updateCurrentWorkflow({
      nodes: nodes.map(n => ({ ...n, status: 'idle' as const })),
      connections: connections.map(c => ({ ...c, isActive: false }))
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
            <p className="text-slate-600">
              Build workflows where AI agents communicate through data streaming
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={isConnectionMode ? "default" : "outline"}
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
              <Button 
                onClick={handleRunWorkflow} 
                disabled={nodes.length === 0}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Run Workflow
              </Button>
            )}
          </div>
        </div>

        {/* Workflow Tabs */}
        <WorkflowTabs
          workflows={workflows}
          currentWorkflowId={currentWorkflowId}
          onSelectWorkflow={setCurrentWorkflowId}
          onCreateWorkflow={handleCreateWorkflow}
          onRenameWorkflow={handleRenameWorkflow}
          onDeleteWorkflow={handleDeleteWorkflow}
          onDuplicateWorkflow={handleDuplicateWorkflow}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Agent Library Sidebar */}
        <AgentSidebar
          agents={agents}
          onAddNode={handleAddNode}
          onCreateAgent={() => setIsCreateDialogOpen(true)}
        />

        {/* Workflow Canvas */}
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

        {/* Streaming Messages Panel */}
        <StreamingPanel
          messages={messages}
          nodes={nodes}
          agents={agents}
          connections={connections}
        />
      </div>

      {/* Create Agent Dialog */}
      <CreateAgentDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateAgent={handleCreateAgent}
      />
    </div>
  );
}