# Register Allocation Simulator

> **Visualize How Compilers Allocate Registers** — An interactive simulator for LLVM IR graph coloring register allocation.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![C++17](https://img.shields.io/badge/C++-17-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-cyan)

---

## Overview

The **Register Allocation Simulator** is a premium developer tool that brings compiler register allocation to life. It accepts a single basic block of LLVM IR, performs backward liveness analysis, builds an interference graph, runs the Chaitin graph coloring algorithm, assigns physical registers, and detects spills — all visualized interactively in real-time.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │   Hero   │ │   IR     │ │  D3.js   │ │  Animation    │  │
│  │   Page   │ │  Editor  │ │  Graph   │ │  Engine       │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / JSON
┌──────────────────────────▼──────────────────────────────────┐
│              Backend (C++17, CMake, STL)                    │
│  ┌──────────┐ ┌──────────────┐ ┌────────────┐ ┌─────────┐  │
│  │   IR     │ │   Liveness   │ │Interference│ │ Chaitin │  │
│  │  Parser  │ │   Analyzer   │ │   Graph    │ │ Coloring│  │
│  └──────────┘ └──────────────┘ └────────────┘ └─────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Features

### Core Algorithm Implementation
- **LLVM IR Parsing** — Parse `add`, `sub`, `mul`, `load`, `store`, `phi`, `ret`
- **Backward Liveness Analysis** — Compute USE/DEF/LIVE-IN/LIVE-OUT with iteration convergence
- **Interference Graph** — Undirected graph with adjacency lists, degree calculation
- **Chaitin Graph Coloring** — Simplification stack, node removal, color assignment
- **Spill Detection** — Identify variables that cannot be colored, suggest spill candidates

### Frontend Visualization
- **Hero Landing Page** — Animated background with interference graph particles
- **LLVM IR Editor** — Multi-line textarea with example loaders and register count selector
- **Liveness View** — Table showing USE/DEF/LIVE-IN/LIVE-OUT per instruction, iteration playback
- **Interference Graph** — Interactive D3.js force-directed graph with zoom, pan, drag, hover
- **Coloring View** — Step-by-step algorithm walkthrough with simplification stack
- **Spill Analysis** — Register pressure heatmap, spill candidate analysis, explanations

### Design System
- Dark mode with deep background (#0B1020)
- Glassmorphism panels with backdrop blur
- Cyan/purple gradient accents
- Framer Motion animations throughout
- Register color coding: R1=blue, R2=green, R3=orange, R4=purple

### Export
- JSON analysis export
- DOT graph export (GraphViz compatible)
- SVG graph export
- Allocation report

---

## Project Structure

```
register-allocation-simulator/
├── backend/
│   ├── CMakeLists.txt
│   ├── include/
│   │   ├── Instruction.h
│   │   ├── BasicBlock.h
│   │   ├── LivenessAnalyzer.h
│   │   ├── InterferenceGraph.h
│   │   └── RegisterAllocator.h
│   ├── src/
│   │   ├── Instruction.cpp
│   │   ├── BasicBlock.cpp
│   │   ├── LivenessAnalyzer.cpp
│   │   ├── InterferenceGraph.cpp
│   │   ├── RegisterAllocator.cpp
│   │   └── main.cpp
│   ├── tests/
│   │   └── test_allocator.cpp
│   └── graphs/
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── simulator/page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── slider.tsx
│   │   │   │   └── tooltip.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── AnimatedBackground.tsx
│   │   │   ├── IREditor.tsx
│   │   │   ├── LivenessView.tsx
│   │   │   ├── InterferenceGraphView.tsx
│   │   │   ├── ColoringView.tsx
│   │   │   └── SpillAnalysisView.tsx
│   │   ├── lib/
│   │   │   ├── utils.ts
│   │   │   └── AllocatorEngine.ts
│   │   └── types/
│   │       └── index.ts
│   └── public/
├── examples/
│   ├── simple.ll
│   ├── spill_required.ll
│   ├── benchmark.ll
│   └── high_pressure.ll
├── testcases/
│   ├── minimal.ll
│   ├── simple.ll
│   ├── spill_required.ll
│   ├── benchmark.ll
│   ├── high_pressure.ll
│   └── complex_spill.ll
├── docs/
├── screenshots/
├── docker-compose.yml
├── Dockerfile
├── Makefile
└── README.md
```

---

## Quick Start

### One-Command Setup

```bash
./build.sh      # Build everything
./run.sh        # Run with default testcase
```

### Manual Setup

#### Backend

```bash
cd backend
mkdir -p build && cd build
cmake ..
cmake --build . --config Release
./rasim                    # Run with default IR
./rasim ../../testcases/simple.ll -k 4  # Run with example
./run_tests                # Run tests
```

#### Frontend

```bash
cd frontend
npm install
npm run dev     # http://localhost:3000
```

#### Docker

```bash
docker compose up
# Frontend: http://localhost:3000
```

---

## How The Algorithm Works

### 1. Liveness Analysis (Backward Dataflow)

For each instruction, we compute:
- **USE[n]** — Variables read by instruction n
- **DEF[n]** — Variables written by instruction n
- **OUT[n]** — Union of IN[s] for all successors s
- **IN[n]** — USE[n] ∪ (OUT[n] - DEF[n])

The analysis iterates backward through the basic block until convergence.

### 2. Interference Graph

Two variables interfere if they are live simultaneously. The graph has:
- **Nodes** = Virtual registers / SSA variables
- **Edges** = Interference between two variables
- **Degree** = Number of interfering neighbors

### 3. Chaitin Graph Coloring

Given K physical registers:

1. **Simplify**: Remove nodes with degree < K, push to stack
2. **Spill**: If all remaining nodes have degree ≥ K, pick a spill candidate (highest degree)
3. **Assign**: Pop stack, assign lowest-numbered color not used by neighbors
4. **Detect**: If a node cannot be colored, it must be spilled to memory

### 4. Spill Detection

If the graph cannot be colored with K colors:
- Variables that cannot be assigned are marked as spill candidates
- These must be stored to memory and reloaded when needed
- The allocator shows which variables cause the conflict

---

## Test Cases

| Example | Registers | Expected Result |
|---------|-----------|-----------------|
| `minimal.ll` | 1 | No spills |
| `simple.ll` | 4 | No spills |
| `spill_required.ll` | 2 | Spill required |
| `benchmark.ll` | 3 | May spill |
| `high_pressure.ll` | 4 | May spill |
| `complex_spill.ll` | 3 | Spill required |

---

## Comparison with Real LLVM Allocator

| Feature | This Simulator | LLVM (Greedy) |
|---------|---------------|---------------|
| Algorithm | Chaitin graph coloring | Greedy register allocation |
| Scope | Single basic block | Whole function |
| Spilling | Basic heuristic (highest degree) | Live interval splitting |
| Coalescing | Not implemented | Built-in coalescing |
| SSA | Simple SSA-like variables | Full SSA deconstruction |
| Live ranges | Per-instruction intervals | Live intervals with holes |

---

## Technology Stack

### Backend
- **C++17** — Core algorithm implementation
- **CMake** — Build system
- **STL** — Standard Template Library
- **GraphViz** — DOT graph generation

### Frontend
- **Next.js 15** — React framework
- **TypeScript** — Type safety
- **Tailwind CSS** — Utility-first styling
- **Framer Motion** — Animations
- **D3.js** — Force-directed graph visualization
- **Radix UI** — Accessible primitives
- **Lucide** — Icons

### DevOps
- **Docker** — Containerization
- **Docker Compose** — Multi-service orchestration
- **Makefile** — Build automation

---

## Complexity Analysis

| Phase | Time Complexity | Space Complexity |
|-------|----------------|-----------------|
| Liveness Analysis | O(N × V) | O(N × V) |
| Interference Graph | O(N × V²) | O(V²) |
| Chaitin Coloring | O(V²) | O(V²) |
| Total | O(N × V²) | O(V²) |

Where N = instructions, V = variables

---

## License

MIT

---

## Credits

Inspired by:
- [LLVM Register Allocation](https://llvm.org/docs/RegisterAllocator.html)
- Chaitin et al., "Register Allocation via Coloring" (1981)
- Muchnick, "Advanced Compiler Design and Implementation"
