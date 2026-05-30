# Source Directory

This directory is an alias reference for the core algorithm source code, which lives at:

```
backend/src/
```

## Files (under `backend/src/`)

| File | Role |
|------|------|
| `main.cpp` | Entry point — argument parsing, phase orchestration, output |
| `BasicBlock.cpp` | LLVM IR parser for a single basic block |
| `Instruction.cpp` | IR instruction model — opcode, def/use extraction |
| `LivenessAnalyzer.cpp` | Backward dataflow liveness analysis |
| `InterferenceGraph.cpp` | Interference graph construction and DOT export |
| `RegisterAllocator.cpp` | Chaitin graph coloring + spill detection |
| `CFGGenerator.cpp` | Control-flow graph builder (used for JSON output) |
| `EventEngine.cpp` | Simulation event recording for frontend |

## Headers (under `backend/include/`)

`Instruction.h` · `BasicBlock.h` · `LivenessAnalyzer.h` · `InterferenceGraph.h` · `RegisterAllocator.h`
