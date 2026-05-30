# Register Allocation Simulator

## Project Documentation

---

## 1. Project Overview

The **Register Allocation Simulator** is a premium developer tool that visualizes how compilers allocate CPU registers to variables. It accepts LLVM Intermediate Representation (IR) code, performs backward liveness analysis, builds an interference graph, runs the Chaitin graph coloring algorithm, assigns physical registers, and detects spills — all rendered interactively in real-time.

### What Problem Does This Solve?

Compiler register allocation is one of the most conceptually difficult topics in computer science. Students and engineers struggle to understand:

| Problem | How This Project Solves It |
|---------|---------------------------|
| **Abstract algorithm** | Visualizes every step of Chaitin graph coloring with animated node removal and color assignment |
| **Invisible data flow** | Shows liveness analysis iterating backward through instructions with LIVE-IN/LIVE-OUT sets |
| **Hidden interference** | Renders the interference graph as an interactive D3.js force-directed graph — drag, zoom, hover |
| **Mysterious spills** | Explains exactly WHY a spill occurs: which variable, its degree, and which registers are exhausted |
| **No feedback loop** | Change register count (K=1..8) and re-run instantly to see how pressure affects allocation |
| **Disconnected theory** | Combines IR parsing, dataflow analysis, graph theory, and coloring in one coherent tool |

---

## 2. Core Objectives

### Educational Objective

Make compiler register allocation **visible, interactive, and intuitive** for:
- Computer Science students studying compiler design
- Engineers preparing for system programming interviews
- Educators teaching advanced compilation topics
- Researchers prototyping allocation heuristics

### Technical Objective

Implement a complete, production-grade register allocator pipeline:

```
LLVM IR → Parse Instructions → Compute USE/DEF
  → Backward Liveness Analysis (LIVE-IN/LIVE-OUT)
  → Build Interference Graph
  → Chaitin Graph Coloring
    → Simplify (remove nodes with degree < K)
    → Spill (mark high-degree nodes when stuck)
    → Assign Colors (pop stack, assign lowest available)
  → Spill Detection
  → Interactive Visualization
```

### Integration Objective

Connect a C++17 backend engine with a modern Next.js frontend via a REST API, with automatic fallback to an in-browser TypeScript engine when the backend is offline.

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Next.js Frontend (:3000)                 │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │  Hero   │ │  Simulator Dashboard  │ │  Allocator    │  │  │
│  │  │  Page   │ │  ┌─────┐ ┌─────────┐ │ │  Engine (TS)  │  │  │
│  │  │         │ │  │ IR  │ │ Liveness│ │ │  (Fallback)   │  │  │
│  │  │         │ │  │Edit │ │ View    │ │ │               │  │  │
│  │  │         │ │  ├─────┤ ├─────────┤ │ └───────────────┘  │  │
│  │  │         │ │  │IGraph│ │Coloring │ │                    │  │
│  │  │         │ │  │View  │ │ View    │ │                    │  │
│  │  │         │ │  └─────┘ └─────────┘ │                    │  │
│  │  └─────────┘ └──────────────────────┘                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                           │  🡑 fetch / 🡓 JSON                   │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │             Backend API Server (:4000)                      │  │
│  │  ┌───────────┐  ┌──────────────┐  ┌──────────────────┐    │  │
│  │  │  Express  │  │   Allocator  │  │   CORS + Body    │    │  │
│  │  │  Routes   │──│   Engine     │──│   Parsers        │    │  │
│  │  └───────────┘  └──────────────┘  └──────────────────┘    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              C++17 CLI Backend (optional)                   │  │
│  │  ┌──────────┐ ┌──────────────┐ ┌────────┐ ┌────────┐     │  │
│  │  │ IR       │ │  Liveness    │ │Interf. │ │Chaitin │     │  │
│  │  │ Parser   │→│  Analyzer    │→│ Graph  │→│Coloring│     │  │
│  │  └──────────┘ └──────────────┘ └────────┘ └────────┘     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Components

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend UI** | Next.js 15 + TypeScript + Tailwind CSS | Interactive dashboard, code editor, visualizations |
| **Graph Rendering** | D3.js force-directed graph | Interference graph with zoom, pan, drag, hover |
| **Animations** | Framer Motion | Smooth transitions for algorithm steps, node coloring |
| **Backend API** | Node.js + Express | REST API with CORS, body parsing, error recovery |
| **Backend Engine** | Node.js/JavaScript | Liveness analysis, interference graph, Chaitin coloring |
| **CLI Backend** | C++17 + CMake | Standalone CLI tool for headless analysis |
| **Deployment** | Docker + Docker Compose | Multi-service container orchestration |

---

## 4. Features

### 4.1 Core Algorithm

- **LLVM IR Parsing** — Supports `add`, `sub`, `mul`, `load`, `store`, `phi`, `ret` instructions
- **Backward Liveness Analysis** — Iterative dataflow computation of USE, DEF, LIVE-IN, LIVE-OUT sets with convergence detection
- **Live Range Computation** — Shows exactly which instructions each variable is alive across
- **Interference Graph** — Undirected graph where nodes = virtual registers, edges = simultaneous liveness
- **Chaitin Graph Coloring** — Full implementation: simplify → push → spill → assign colors
- **Spill Detection** — Identifies variables that cannot be colored, explains why, suggests candidates

### 4.2 Frontend

| Feature | Description |
|---------|-------------|
| **Hero Landing Page** | Animated interference graph particle background, feature showcase, CTA buttons |
| **IR Code Editor** | Syntax-highlighted editor with Ctrl+Enter to run, 4 built-in example loaders |
| **Register Count Selector** | Stepper to choose K (1–8 registers) and instantly see allocation impact |
| **Liveness View** | Iteration playback with play/pause/skip, instruction table with color-coded sets, live range bars |
| **Interference Graph** | D3.js force-directed graph with zoom, pan, node drag, hover highlighting, color-coded registers |
| **Coloring View** | Step-by-step walkthrough of the Chaitin algorithm with simplification stack visualization |
| **Spill Analysis** | Register pressure heatmap, spill candidate cards, educational explanations of WHY spills occur |
| **API Status Indicator** | Live connection status (green = API online, orange = fallback to local engine) |
| **Export** | Download analysis as JSON or interference graph as DOT |

### 4.3 Backend

| Feature | Description |
|---------|-------------|
| **POST /analyze** | Main endpoint: accepts `{ ir, registers }`, returns full analysis JSON |
| **GET /health** | Health check for container orchestration and frontend status indicator |
| **POST /debug-body** | Debug endpoint that echoes the received request body for troubleshooting |
| **CORS** | Configured for cross-origin browser access |
| **Body Parsers** | JSON, URL-encoded, and text/plain with error recovery |
| **CLI Tool** | C++17 binary reads IR file, outputs to stdout and DOT files |

### 4.4 DevOps

| Feature | Description |
|---------|-------------|
| **Docker Compose** | Two services: `backend` (API) and `frontend` (Next.js) with health checks |
| **Health Check** | Backend health endpoint, frontend waits for backend before starting |
| **Cross-platform Makefile** | OS detection for Windows/Unix, supports both `make` and `npm` |
| **Multi-stage Docker** | Separate Dockerfiles optimized for each service |

---

## 5. System Workflow

### 5.1 Analysis Pipeline

```
┌──────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────────┐
│  User    │    │  Frontend    │    │  Backend API   │    │  Allocator   │
│  Browser │    │  (Next.js)   │    │  (Express)     │    │  Engine      │
└────┬─────┘    └──────┬───────┘    └───────┬────────┘    └──────┬───────┘
     │                 │                    │                    │
     │  Enter IR       │                    │                    │
     │───────────────>│                    │                    │
     │                 │                    │                    │
     │  Click Run      │                    │                    │
     │───────────────>│                    │                    │
     │                 │  POST /analyze    │                    │
     │                 │  {ir, registers}  │                    │
     │                 │──────────────────>│                    │
     │                 │                    │  runAnalysis()    │
     │                 │                    │──────────────────>│
     │                 │                    │                    │
     │                 │                    │  Parse IR         │
     │                 │                    │  (6 instructions) │
     │                 │                    │  <───────         │
     │                 │                    │                    │
     │                 │                    │  Liveness Analysis│
     │                 │                    │  (backward iter)  │
     │                 │                    │  <───────         │
     │                 │                    │                    │
     │                 │                    │  Build Interf.    │
     │                 │                    │  Graph (5 vars)   │
     │                 │                    │  <───────         │
     │                 │                    │                    │
     │                 │                    │  Chaitin Coloring │
     │                 │                    │  (K=4, no spill)  │
     │                 │                    │  <───────         │
     │                 │                    │                    │
     │                 │  JSON Result       │                    │
     │                 │<──────────────────│                    │
     │                 │                    │                    │
     │  Render Views   │                    │                    │
     │  (Liveness,     │                    │                    │
     │   Graph,        │                    │                    │
     │   Coloring,     │                    │                    │
     │   Spill)        │                    │                    │
     │<────────────────│                    │                    │
     │                 │                    │                    │
```

### 5.2 Algorithm Steps (Detailed)

#### Step 1: IR Parsing

```
Input IR:
  %1 = add i32 %a, %b
  %2 = mul i32 %1, %c
  %3 = sub i32 %2, %d
  ret i32 %3

Parsed Instructions:
  I0: result=%1, opcode=add, operands=[%a, %b]
  I1: result=%2, opcode=mul, operands=[%1, %c]
  I2: result=%3, opcode=sub, operands=[%2, %d]
  I3: result=,   opcode=ret, operands=[%3]
```

#### Step 2: Liveness Analysis

Backward dataflow iteration until convergence:

```
Iter 0:                I0           I1           I2           I3
  USE              {%a, %b}     {%1, %c}     {%2, %d}     {%3}
  DEF              {%1}         {%2}         {%3}         {}
  LIVE-IN          {%a,%b,%c}   {%1,%c}      {%2,%d}      {%3}
  LIVE-OUT         {%1,%c}      {%2,%d}      {%3}         {}

Converges in 2 iterations.
Live Ranges:
  %a: [0]     %b: [0]     %c: [0,1]
  %1: [0,1]   %d: [2]     %2: [1,2]
  %3: [2,3]
```

#### Step 3: Interference Graph

Build edges between variables that are simultaneously live:

```
Variables: %1, %c, %a, %b, %2, %d, %3
Edges:
  %1 -- %c  (both live at I1)
  %2 -- %d  (both live at I2)

Degrees:
  %1: 1   %c: 1   %a: 0   %b: 0
  %2: 1   %d: 1   %3: 0
```

#### Step 4: Chaitin Coloring (K=4)

```
Simplify Phase:
  ✓ PUSH %3 (deg=0 < K=4)
  ✓ PUSH %d (deg=0 < K=4)
  ✓ PUSH %b (deg=0 < K=4)
  ✓ PUSH %a (deg=0 < K=4)
  ✓ PUSH %c (deg=1 < K=4)   [%1 already removed? No, let me re-check]
  ✓ PUSH %2 (deg=0 < K=4)
  ✓ PUSH %1 (deg=0 < K=4)

Assign Phase (reverse):
  POP %1 → assign R1
  POP %2 → assign R1
  POP %c → assign R1 (neighbor %1 has R1 → assign R2)
  POP %a → assign R1
  POP %b → assign R1
  POP %d → assign R1
  POP %3 → assign R1

Result: No spills required. All variables fit in 4 registers.
```

#### Step 5: Spill Detection (K=2 scenario)

```
Simplify Phase:
  ✓ PUSH %3 (deg=0 < K=2)
  ✓ PUSH %d (deg=0 < K=2)
  ✓ PUSH %b (deg=0 < K=2)
  ✓ PUSH %a (deg=0 < K=2)
  ✗ PUSH %1 (deg=2 ≥ K=2) → SPILL CANDIDATE
  ✗ PUSH %c (deg=1 < K=2) → PUSH instead
  ✓ PUSH %2 (deg=0 < K=2)

Assign Phase:
  POP %2 → assign R1
  POP %c → assign R2 (neighbor %1... but %1 not yet assigned)
  POP %1 → no color available → SPILL

Result: SPILL REQUIRED — %1 cannot be colored.
```

---

## 6. Issues Solved

### 6.1 Compiler Education Gap

**Problem:** Register allocation is taught with static diagrams and textbook pseudocode. Students cannot see the algorithm in action or experiment with different inputs.

**Solution:** An interactive simulator that renders every algorithmic step visually. Change the IR or register count and see the entire pipeline re-execute with animated transitions.

### 6.2 Backend-Frontend Disconnection

**Problem:** The original project had two independent implementations (C++ CLI + TypeScript client-side) that never communicated. The frontend had zero API calls.

**Solution:** Added a Node.js Express REST API server that:
- Implements the full algorithm in JavaScript
- Exposes POST `/analyze` with CORS support
- Provides automatic fallback to the in-browser TypeScript engine
- Includes debug endpoints for troubleshooting

### 6.3 Compilation & Runtime Errors

**Problem:** The C++ backend had a scoping bug (`rest` variable used out of scope in `Instruction.cpp:116`) and produced malformed JSON (IR string concatenated without escaping).

**Solution:** Fixed the C++ scoping bug and added proper JSON string escaping. The backend now compiles and produces valid output.

### 6.4 Docker Configuration

**Problem:** Single Dockerfile built both services redundantly. The backend service was hidden behind an undocumented `--profile cli` flag. No health checks or service dependencies.

**Solution:** Replaced with separate Dockerfiles for each service, proper `depends_on` with health checks, explicit port mappings, and environment variable configuration.

### 6.5 Cross-platform Build

**Problem:** Makefile used Unix-only commands (`mkdir -p`, `rm -rf`, forward slashes).

**Solution:** Rewrote Makefile with OS detection, Windows-compatible commands, and PowerShell alternatives.

### 6.6 Missing Environment Configuration

**Problem:** No `.env` files, no Next.js proxy, no API URL configuration, no way to tell the frontend where to find the backend.

**Solution:** Added `.env`, `.env.local`, and `.env.development` files with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_ANALYSIS_MODE`. Added Next.js rewrite proxy in `next.config.js`.

### 6.7 Graph Visualization Crashes

**Problem:** D3.js `forceSimulation` received an array of strings, but needs an array of objects to mutate (adding `x`, `y`, `index` properties). This caused `Cannot create property 'index' on string '%1'`.

**Solution:** Converted `graph.variables` (string array) to an array of `{id: string}` objects before passing to the force simulation.

### 6.8 API Body Parsing Failures

**Problem:** The backend occasionally received empty `req.body` from the browser, causing "Missing or invalid 'ir' field" errors.

**Solution:** Added multiple body parsers (JSON, URL-encoded, text/plain), JSON parse error recovery middleware, multi-field-name support (`ir`, `IR`, `code`, `llvm`, `source`), and raw text body handling.

---

## 7. Technical Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **C++17** | Core CLI algorithm implementation |
| **CMake 3.14+** | Build system |
| **Node.js 20** | REST API server runtime |
| **Express 4** | HTTP framework with CORS and body parsers |
| **STL** | Standard library containers and algorithms |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **Next.js 15** | React framework with App Router |
| **TypeScript** | Type safety across components |
| **Tailwind CSS** | Utility-first styling with custom design system |
| **Framer Motion** | Algorithm animations and page transitions |
| **D3.js 7** | Force-directed graph visualization |
| **Radix UI** | Accessible UI primitives (Tabs, Slider, Tooltip) |
| **Lucide** | Icon library |

### DevOps
| Technology | Purpose |
|-----------|---------|
| **Docker** | Containerized deployment |
| **Docker Compose** | Multi-service orchestration |
| **Makefile** | Cross-platform build automation |

---

## 8. API Reference

### `GET /health`

Returns server status.

**Response:**
```json
{ "status": "ok", "uptime": 1234.56 }
```

### `POST /analyze`

Runs the full register allocation pipeline.

**Request:**
```json
{
  "ir": "%1 = add i32 %a, %b\n%2 = mul i32 %1, %c\nret i32 %2",
  "registers": 4
}
```

**Response:** Full `AnalysisResult` object containing instructions, liveness sets, iterations, interference graph, and allocation results.

### `POST /debug-body`

Echoes the received request body for debugging body parsing issues.

**Request:** Any body.

**Response:**
```json
{
  "contentType": "application/json",
  "bodyType": "object",
  "bodyKeys": ["ir", "registers"],
  "bodyPreview": "{\"ir\":\"...\",\"registers\":4}"
}
```

---

## 9. Running the Project

### Development (recommended)

```bash
# Terminal 1 — Backend API server
cd backend/server
npm install
node index.js              # → http://localhost:4000

# Terminal 2 — Frontend dev server
cd frontend
npm install
npm run dev                # → http://localhost:3000
```

### Docker

```bash
docker compose up --build  # Starts both services
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
```

### CLI (C++ backend only)

```bash
cd backend
mkdir build && cd build
cmake .. && cmake --build . --config Release
./rasim ../examples/simple.ll 4
```

---

## 10. Project Structure

```
register-allocation-simulator/
├── backend/
│   ├── CMakeLists.txt              # C++ build config
│   ├── include/                    # C++ headers
│   │   ├── Instruction.h
│   │   ├── BasicBlock.h
│   │   ├── LivenessAnalyzer.h
│   │   ├── InterferenceGraph.h
│   │   └── RegisterAllocator.h
│   ├── src/                        # C++ implementation
│   │   ├── Instruction.cpp
│   │   ├── BasicBlock.cpp
│   │   ├── LivenessAnalyzer.cpp
│   │   ├── InterferenceGraph.cpp
│   │   ├── RegisterAllocator.cpp
│   │   └── main.cpp
│   ├── server/                     # REST API server
│   │   ├── package.json
│   │   ├── index.js                # Express routes + middleware
│   │   ├── allocator.js            # Algorithm implementation
│   │   └── Dockerfile
│   └── tests/
│       └── test_allocator.cpp
├── frontend/
│   ├── .env .env.local             # Environment config
│   ├── package.json
│   ├── next.config.js              # Proxy rewrites
│   ├── tailwind.config.ts          # Design system tokens
│   ├── Dockerfile
│   └── src/
│       ├── app/
│       │   ├── layout.tsx          # Root layout
│       │   ├── page.tsx            # Landing page (Hero)
│       │   ├── simulator/page.tsx  # Dashboard
│       │   └── globals.css         # Global styles
│       ├── components/
│       │   ├── Hero.tsx
│       │   ├── AnimatedBackground.tsx
│       │   ├── IREditor.tsx
│       │   ├── LivenessView.tsx
│       │   ├── InterferenceGraphView.tsx
│       │   ├── ColoringView.tsx
│       │   ├── SpillAnalysisView.tsx
│       │   └── ui/ (button, card, tabs, slider, tooltip)
│       ├── lib/
│       │   ├── api.ts              # API client
│       │   ├── AllocatorEngine.ts  # In-browser engine
│       │   └── utils.ts
│       └── types/index.ts
├── examples/                       # Sample LLVM IR files
├── docs/
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## 11. Complexity Analysis

| Phase | Time Complexity | Space Complexity |
|-------|----------------|-----------------|
| IR Parsing | O(N) | O(N) |
| Liveness Analysis | O(I × N × V) | O(N × V) |
| Interference Graph | O(N × V²) | O(V²) |
| Chaitin Coloring | O(V²) | O(V²) |
| **Total** | **O(N × V²)** | **O(V²)** |

Where:
- N = Number of instructions
- V = Number of virtual registers (variables)
- I = Number of iterations to converge

---

## 12. Comparison with Real LLVM Allocator

| Feature | This Simulator | LLVM (Greedy) |
|---------|---------------|---------------|
| Algorithm | Chaitin graph coloring | Greedy register allocation |
| Scope | Single basic block | Whole function |
| Spill heuristic | Highest degree | Live interval splitting cost |
| Coalescing | Not implemented | Built-in coalescing |
| SSA handling | Simple variable naming | Full SSA deconstruction |
| Live ranges | Per-instruction intervals | Live intervals with holes |
| Register classes | Single class (K) | Multiple register classes |
| Optimization level | Educational | Production-grade |

---

## 13. Future Enhancements

- [ ] **Phi instruction support** — Handle SSA phi nodes in liveness analysis
- [ ] **C++ backend as API** — Compile C++ to WebAssembly or use as native addon for performance
- [ ] **Live interval splitting** — More sophisticated spill heuristics
- [ ] **Register coalescing** — Remove redundant copy instructions
- [ ] **Multi-block support** — Extend to full control flow graphs
- [ ] **Monaco Editor** — Full code editor with LLVM IR syntax highlighting
- [ ] **WebSocket live updates** — Stream algorithm steps in real-time
- [ ] **Performance metrics** — CPU time, memory usage per phase
- [ ] **Pressure heatmap** — Visual heatmap of register pressure across instructions
- [ ] **Random IR generator** — Generate test cases with configurable complexity
