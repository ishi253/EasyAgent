import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { AgentSidebar } from './components/AgentSidebar';
import { StreamingPanel } from './components/StreamingPanel';
import { WorkflowTabs } from './components/WorkflowTabs';
import { AgentLibraryPage } from './components/AgentLibraryPage';

const baseEnv = "http://127.0.0.1:8000"
export interface Agent {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
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

const FALLBACK_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Research Agent',
    description: 'Gathers and analyzes information',
    prompt:
      'You are a research specialist. Analyze the input and extract key insights, facts, and relevant information. Present findings in a structured format.',
    category: 'Research'
  },
  {
    id: '5',
    name: 'Data Analyst Agent',
    description: 'Analyzes datasets to find trends and insights.',
    prompt:
      'You are a data analyst. Given a dataset (CSV or JSON), perform statistical analysis, identify key trends, and return a summary of your findings.',
    category: 'Data'
  },
  {
    id: '6',
    name: 'Task Prioritizer',
    description: 'Organizes a list of tasks based on priority.',
    prompt:
      'You are an expert project manager. Take the following list of tasks and organize them by priority (high, medium, low) and logical order of completion. Return the prioritized list.',
    category: 'Planning'
  },
  {
    id: '4',
    name: 'Code Generator',
    description: 'Generates code from specifications',
    prompt:
      'You are a senior software engineer. Convert specifications and requirements into clean, well-documented code following best practices.',
    category: 'Development'
  },
];

// --- MAIN APP COMPONENT ---
export default function App() {
  // Agents state lives here. Creation happens only via AgentLibraryPage.
  const [agents, setAgents] = useState<Agent[]>(FALLBACK_AGENTS);

  useEffect(() => {
    let isMounted = true;

    const normalizeAgentRecord = (record: any, index: number): Agent => {
      const rawPrompt = record?.prompt ?? '';
      const normalizedPrompt =
        typeof rawPrompt === 'string' ? rawPrompt : JSON.stringify(rawPrompt ?? {}, null, 2);

      return {
        id: String(record?.agent_id ?? record?.id ?? `agent-${index}`),
        name: record?.name ?? `Agent ${index + 1}`,
        description: record?.description ?? 'No description provided.',
        prompt: normalizedPrompt || 'Prompt unavailable.',
        category: record?.category ?? 'General',
      };
    };

    const fetchAgents = async () => {
      try {
        const response = await fetch(`${baseEnv}/database`);
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Backend error ${response.status}: ${errorBody}`);
        }
        const data = await response.json();

        if (Array.isArray(data) && isMounted) {
          const normalized = data.map((record, index) => normalizeAgentRecord(record, index));
          setAgents(normalized.length ? normalized : FALLBACK_AGENTS);
        }
      } catch (error) {
        console.error("Failed to load agents from database:", error);
        if (isMounted) {
          setAgents(FALLBACK_AGENTS);
        }
      }
    };

    fetchAgents();
    return () => {
      isMounted = false;
    };
  }, []);

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
    const workflowData = getFormattedWorkflowData();
    console.log("Workflow data to send:", workflowData);
    // You can now send this `workflowData` object to your backend here.
    if (!workflowData) return;
    try {
      const response = await fetch(`${baseEnv}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Backend error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      console.log("Backend response:", data);
    } catch (error) {
      console.error("Failed to send workflow to backend:", error);
    }
    // -------------

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
    <Box height="100vh" display="flex" flexDirection="column" bgcolor="background.default">
      <Paper
        square
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: { xs: 2, md: 4 },
          py: 3,
        }}
      >
        <Stack spacing={currentPage === 'workflow' ? 2 : 1}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
          >
            <Box>
              <Typography variant="h4" fontWeight={600} gutterBottom>
                Agent Workflow Studio
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant={currentPage === 'library' ? 'contained' : 'text'}
                  size="small"
                  onClick={() => setCurrentPage('library')}
                >
                  Agent Library
                </Button>
                <Button
                  variant={currentPage === 'workflow' ? 'contained' : 'text'}
                  size="small"
                  onClick={() => setCurrentPage('workflow')}
                >
                  Workflow Studio
                </Button>
              </Stack>
            </Box>

            {currentPage === 'workflow' && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Button
                  variant={isConnectionMode ? 'contained' : 'outlined'}
                  color={isConnectionMode ? 'primary' : 'inherit'}
                  onClick={() => setIsConnectionMode(!isConnectionMode)}
                  disabled={isRunning || nodes.length < 2}
                  startIcon={<LinkIcon fontSize="small" />}
                >
                  {isConnectionMode ? 'Connecting…' : 'Add Connection'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClearWorkflow}
                  disabled={isRunning || nodes.length === 0}
                >
                  Clear Canvas
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SaveOutlinedIcon fontSize="small" />}
                  onClick={handleStopWorkflow}
                  disabled={isRunning || nodes.length === 0}
                >
                  Save Workflow
                </Button>
                {isRunning ? (
                  <Button
                    color="error"
                    variant="contained"
                    onClick={handleStopWorkflow}
                    startIcon={<StopRoundedIcon fontSize="small" />}
                  >
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleRunWorkflow}
                    disabled={nodes.length === 0}
                    startIcon={<PlayArrowRoundedIcon fontSize="small" />}
                  >
                    Run Workflow
                  </Button>
                )}
              </Stack>
            )}
          </Stack>

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
        </Stack>
      </Paper>

      <Box flex={1} display="flex" overflow="hidden">
        {currentPage === 'workflow' ? (
          <>
            <AgentSidebar agents={availableAgents} onAddNode={handleAddNode} />
            <Box flex={1} overflow="hidden">
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
            </Box>
            <StreamingPanel messages={messages} nodes={nodes} agents={agents} connections={connections} />
          </>
        ) : (
          <Box flex={1} overflow="hidden">
            <AgentLibraryPage agents={agents} onCreateAgent={handleCreateAgent} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
