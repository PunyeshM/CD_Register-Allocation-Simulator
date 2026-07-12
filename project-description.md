
# Register Allocation Simulator — Project Description

## Overview

This project implements a register allocation simulator and visualizer from scratch. It provides multiple allocation algorithms (including Linear Scan and Optimistic Coloring), analysis tools (liveness, interference graph), a C++ simulator backend, a Node.js server API, and a modern web frontend (Next.js + React + TypeScript) for visualization, interaction, and experiments.

Goals:
- Build a clear, extensible simulator for studying register allocation strategies.
- Provide visual tools to inspect control-flow graphs, live ranges, interference graphs, and allocation results.
- Offer reproducible experiments and benchmarks to evaluate allocation quality and spill behavior.

## Key Features

- Multiple allocation algorithms: Linear Scan, Optimistic Coloring (and a baseline allocator).
- Static analysis passes: liveness analysis, live-range computation, interference graph construction.
- Visualization: CFG viewer, live-range charts, interference graph (2D/3D), register file, and spill analysis.
- CLI tools and examples to run benchmarks and stress tests.
- Docker support and CMake build for reproducible builds.

## Tech Stack

- Core language: C++ (backend simulator and algorithms). Built using `CMake`.
- Server/API: Node.js (Express) — simple API wrapper used by the frontend.
- Frontend: Next.js + React + TypeScript, Tailwind CSS for styling and UI components.
- Packaging & DevOps: Docker, `docker-compose` for local deployment.
- Tests: GoogleTest (C++) for unit tests located under `tests/`.

## Repository Layout (high level)

- `backend/` — C++ source, `CMakeLists.txt`, build artifacts in `backend/build/`.
  - `include/` — public headers: `LivenessAnalyzer.h`, `InterferenceGraph.h`, `LinearScanAllocator.h`, etc.
  - `src/` — implementations for analysis and allocation algorithms.
  - `tests/` — unit tests and test harnesses.
- `server/` — Node.js API and Dockerfile for lightweight backend serving.
- `frontend/` — Next.js application with interactive visualizations and UI components.
- `examples/`, `testcases/` — sample IR files and benchmarks used for evaluation.
- `graphs/`, `screenshots/` — generated outputs for documentation and poster use.

## Build & Run (developer quickstart)

1. Build the C++ backend (requires a C++ toolchain and CMake):

   mkdir -p backend/build
   cd backend/build
   cmake ..
   cmake --build .

2. Run unit tests:

   cd backend/build
   ctest --output-on-failure

3. Start server and frontend (using docker-compose or locally):

   docker-compose up --build

Or run server and frontend separately:

   # server
   cd server
   npm install
   node index.js

   # frontend
   cd frontend
   npm install
   npm run dev

## README Guidance (what to include in `README.md`)

- Project title and one-line description.
- Short demo GIF or screenshot (place under `screenshots/`).
- Quickstart (build, run, examples).
- Feature list and what each component does.
- How to run experiments and reproduce graphs in `graphs/`.
- Contact, contributors, and license.

## Poster Content (one-page / slide-friendly bullets)

- Title: "Register Allocation Simulator: Visualizing Allocation Strategies"
- Authors and affiliation.
- Abstract: 2–3 sentences summarizing goals and results.
- Motivation: Why register allocation matters; trade-offs (spills vs. register pressure).
- Methods: Algorithms implemented (Linear Scan, Optimistic Coloring) with 1–2 bullets each describing complexity and behavior.
- Visuals: CFG screenshot, Live-range chart, Interference graph, Register-file snapshot (use images from `screenshots/`).
- Results: Key metrics (spill counts, execution cost increase, allocation time) across benchmarks.
- Takeaway: When each algorithm performs best; future work.

Suggested poster layout:
- Left column: Motivation + Methods + Small CFG image
- Center: Large visualizations (Interference graph, Live ranges)
- Right column: Results table + Conclusions + Contact

## Report Outline (detailed structure for academic report)

1. Abstract (150–250 words)
2. Introduction
   - Background on register allocation and importance.
   - Research questions and goals.
3. Related Work
   - Classic algorithms and modern approaches.
4. Design and Implementation
   - IR format used in `testcases/` and `examples/`.
   - Liveness analysis: approach and complexity.
   - Interference graph construction.
   - Allocators implemented: `LinearScanAllocator`, `OptimisticColoringAllocator`, design decisions.
   - System architecture (C++ backend, Node server, Next.js frontend).
5. Experimental Methodology
   - Benchmarks used and why (`testcases/` list).
   - Metrics: spill count, register pressure, allocation time, memory.
   - Environment (hardware, Docker/container versions, compile flags).
6. Results
   - Tables and graphs (from `graphs/analysis.json` and dot files).
   - Per-benchmark discussion.
7. Discussion
   - Interpret results: strengths and weaknesses of each algorithm.
   - Limitations and threats to validity.
8. Conclusion and Future Work
9. Appendix
   - Build instructions, command logs, sample inputs, and additional screenshots.

## Suggested Metrics & Experiments

- Spill count per benchmark (absolute and normalized).
- Allocation/runtime overhead (time to allocate registers vs. program execution time).
- Register pressure profile over program points (visualized as charts).
- Scalability: run with artificially large programs to measure runtime scaling.

## Files to Reference When Writing Poster/Report

- Core algorithms and analysis: `backend/include` and `backend/src` files (e.g. `LivenessAnalyzer.cpp`, `InterferenceGraph.cpp`, `LinearScanAllocator.cpp`, `OptimisticColoringAllocator.cpp`).
- Visual components: `frontend/src/components/` (CFGViewer, LivenessView, InterferenceGraphView).
- Benchmarks: `testcases/` and `examples/`.
- Graph data: `graphs/` (DOT files and `analysis.json`).

## Suggested Figures and Captions

- Figure 1: Control-flow graph for `simple.ll` — "CFG of the sample program showing basic blocks and edges."
- Figure 2: Live ranges for a function — "Live ranges across program points showing overlap and spill points."
- Figure 3: Interference graph — "Nodes = virtual registers; edges = interference; colors show assigned machine registers."
- Figure 4: Spill analysis table — "Spills per algorithm across benchmarks."

## Contribution & Licensing

- Authors: list contributors in `README.md` and here.
- License: Add an OSI-compatible license (MIT/Apache-2.0) and document in `LICENSE`.

## Next Steps / Optional Extras

- Add automated benchmark scripts that produce `graphs/` outputs and `analysis.json`.
- Export high-resolution images from the frontend for poster use.
- Add a short tutorial notebook or step-by-step walkthrough in `docs/`.

---

This document aims to provide everything you need to craft a poster and write a report: background, technical details, reproducible build/run steps, experiment ideas, and suggested figures. Tell me which sections you'd like expanded or if you want slide-ready text and captions generated.
