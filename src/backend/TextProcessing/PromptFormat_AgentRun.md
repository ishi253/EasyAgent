# MCP Agent Run Instruction Prompt

**Purpose:** Provide an agent (already connected to the MCP) with the exact
steps it must take to execute a task successfully.

----------
### MCP Execution Prompt
**Task:** `<clear goal statement for the agent>`
**Context:**
- **Environment:** `<repo path, branch, runtime versions>`
- **Recent Activity:** `<summary of prior runs or relevant history>`
- **Dependencies:** `<files, services, MCP states the agent must reuse>`
- **Deadlines / SLAs:** `<time limits or reporting windows>`

#### Required MCP Calls
1. `function_name(arg_1=<value/placeholder>, ...)`
   - Use when: `<trigger condition>`
   - Expected response: `<schema or fields>`
   - Follow-up: `<next action based on success>`
2. `function_name_2(...)`
   - ...

#### Step-by-Step Instructions
1. Validate `<preconditions or inputs>`.
2. Invoke `<MCP function>` with `<parameters>` and wait for completion.
3. Interpret the response:
   - If `<condition A>` → do `<action/next function>`.
   - If `<condition B>` → retry / escalate `<details>`.
4. Produce final artifact/output as `<format/location>`.


> Include concrete parameter values, file paths, and success criteria when
> instantiating this prompt so the agent always knows how to act.
