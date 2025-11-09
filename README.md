# 🧠 EasyAgent


> Build and deploy AI agents from natural language.
> Create parallel workflows that connect those agents anywhere— no code required.

---

## 🚀 Overview

**EasyAgent** is a tool that turns natural language descriptions into any kind of structured, runnable AI agents. The goal is to make building and using complex AI systems as simple as describing them.

Users describe what they want an agent to do, and we automatically:

1.  **Parse** any user text input into a functional specification (model, tools, constraints).
2.  **Build** a customized MCP server equipping the AI with tools and functionality.
3.  **Enable** users to connect and maintain a library of custom agents into a visual, no-code, executable workflow.

Our core idea: **“If you can describe it, you can deploy it.”**

---

## ✨ Key Features

* **📝 Natural Language Agent Creation**: Use **Claude** to parse plain text instructions into a formal **MCP (Model Context Protocol)** agent blueprint.
* **🔗 Drag-and-Drop Workflow Builder**: Visually chain multiple agents and tools into any cusrtomizable flow in any order.
* **⚡ Hot-Reload Local Dev Server**: A complete React/Vite-based UI for building and local testing.
* **🧰 MCP & Native Tool Support**: Designed to use **Model Context Protocol (MCP)** to link popular tools (e.g., web scraping, APIs, web search) with unique, native tool requests (e.g. Google Sheets, macros, formulas, etc).
* **🔒 Smart Data Streaming**: Workflows are orchestrated by **Red Panda**, acting as a high-speed shared data knowledge hub that streams data to agents as needed.
* **🚀 Parallel Execution**: Our orchestrator analyzes the workflow graph to run independent agents concurrently, dramatically speeding up results.

----


## 🏗️ Architecture

EasyAgent's architecture is designed for speed and scalability. A React frontend communicates with a Node.js API, which manages agent creation. Workflow execution is handled by a Red Panda streaming hub that orchestrates data flow between containerized agents.

graph LR
    %% Design Time
    A[Browser UI (React)] --> B[API Server (Node.js)]
    B --> C[(SQLite DB)]
    A --> D[Text Input]
    D --> E[Claude LLM]
    E --> F[MCP Blueprint]
    F --> C
    A --> G[Workflow Canvas]

    %% Runtime
    G --> H[Execution Planner]
    H --> I[Red Panda Orchestrator]
    I --> J[Agent 1]
    I --> K[Agent 2]
    I --> L[Agent 3]
    J --> I
    K --> I
    L --> I
    I --> M[Browser UI (Results)]

    %% Agent Services
    J --> N[MCP Server]
    K --> N
    L --> N
    N --> O[External Tools / APIs / DBs]





### 🛠️ Tech Stack

Backend

- Node.js - Async runtime
- TypeScript - Type safety
- Fastify / Express - API server
- SQLite - Agent library database


Orchestration & Data

- Red Panda - Streaming data hub and workflow orchestrator
- Docker - Containerizing agents and services


AI & Frontend

- Claude (Anthropic) - Natural language parsing
- React - UI framework
- Vite - Build tooling
- React Flow - Workflow canvas component
- MCP (Model Context Protocol) - Standard for agent tools




### 🚀 Quick Start
Prerequisites
- Node.js 18+
- npm or yarn
- Docker (for Red Panda)
- Claude API Key


### 1. Clone & Setup Environment

```bash
git clone https://github.com/ishi253/EasyAgent.git
cd EasyAgent

# Create .env file
echo "CLAUDE_API_KEY=your_key_here" > .env
echo "DATABASE_URL=file:./easyagent.db" >> .env
echo "REDPANDA_BROKERS=localhost:9092" >> .env
```

### 2. Start RedPanda

```bash
# This will start a single-node Red Panda cluster in Docker
docker-compose up -d

```

### 3. Install & Local Host

```bash
# Install all monorepo dependencies
npm install

# Start the API and React frontend concurrently
npm run dev

```

### 4. Start Building!

Navigate to http://localhost:3000.

Go to the Agent Library to create your first agent using plain text.

Go to the Workflow Studio to drag your agents onto the canvas, connect them, and hit Run.


🧠 How It Works
1. Text → Agent (Creation)
User Input: A user provides a natural language prompt (e.g., "make an agent that reads CSVs and finds all expenses over $100").

Claude Parsing: This prompt is sent to Claude, which is instructed to parse the text and return a structured MCP blueprint (JSON spec).

Registration: The blueprint is saved to the SQLite database. The agent is now available in the library and "attached" to the MCP Server, which allocates its required tools (like csv_reader).

2. Workflow → Run (Execution)
Graph Analysis: When "Run" is clicked, the Execution Planner analyzes the visual graph of nodes and edges.

Queue Prioritization: It builds an execution queue by identifying all nodes with 0 inputs (depth 0). These are the starting points.

Orchestration: The planner instructs Red Panda to create the necessary data topics. It places the "depth 0" agents into the execution pool.

Streaming & Concurrency: As agents run (concurrently if independent), they publish their results to their designated Red Panda output topics. Red Panda, acting as the orchestrator, sees this new data and automatically triggers the next agents in the graph that were waiting for that specific data topic as an input.

Completion: The flow continues until all data has streamed through the graph and the final output topics have data. The UI, which is subscribed to these topics, displays the final results.


EasyAgent/
├── apps/
│   ├── web/                # React frontend (Vite)
│   │   ├── src/
│   │   └── App.tsx         # Main studio UI
│   └── api/                # Node.js backend
│       └── server.ts       # API routes, Claude logic
├── packages/
│   ├── core/               # Core engine (graph planner)
│   ├── mcp/                # MCP server & tool definitions
│   └── cli/                # Command-line utilities
├── docker-compose.yml      # Red Panda service
└── package.json            # Root monorepo config


## 🔒 Privacy & Security

- All processing happens locally on your machine
- API keys never sent to browser
- No user data collected or stored

## 🏆 HackPrinceton 2025 Submission

Built with ❤️ by Team EasyAgent at HackPrinceton 2025
