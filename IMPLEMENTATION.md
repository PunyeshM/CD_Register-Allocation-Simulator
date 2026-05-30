# Implementation Details

The Register Allocation Simulator is built with a **C++17 backend** for the core algorithm and a **Next.js/TypeScript frontend** for visualization. The backend can also run standalone via `./run.sh`.

---

## Core Data Structures

### `Instruction` (`Instruction.h / .cpp`)

Represents one LLVM IR instruction:

```cpp
struct Instruction {
    std::string              result;    // LHS variable, e.g. "%1"
    Opcode                   opcode;    // ADD, SUB, MUL, LOAD, STORE, PHI, RET, NOP
    std::vector<std::string> operands;  // RHS variables, e.g. ["%a", "%b"]
    size_t                   index;     // Position in the basic block
};
```

**DEF/USE extraction** is done by `getUses()` / `getDefs()`:
- `getDefs()` → `{result}` (empty for `ret`, `store`)
- `getUses()` → set of all `%`-prefixed operands

**Why `std::string` for variable names?** SSA variable names are not dense integers; they include function parameters (`%a`, `%b`) alongside numbered temporaries (`%1`, `%2`). String keys allow both without a separate symbol table.

---

### `BasicBlock` (`BasicBlock.h / .cpp`)

A sequential list of `Instruction` objects (single-entry, single-exit, no branches within):

```cpp
class BasicBlock {
    std::string              name;         // e.g. "entry"
    std::vector<Instruction> instructions;
};
```

`parseFromIR(ir)` strips `define`, `{`, `}`, blank lines, and bare block labels, then hands each remaining line to `Instruction::parse()`.

---

### `LivenessAnalyzer` (`LivenessAnalyzer.h / .cpp`)

Stores per-instruction liveness sets:

```cpp
struct LiveSet {
    std::set<std::string> use, def, liveIn, liveOut;
};
std::vector<LiveSet> liveSets; // index-aligned with BasicBlock::instructions
```

**Algorithm pseudocode:**

```
for each instruction i (backward, i = n-1 downto 0):
    OUT[i] = IN[i+1]          // IN of next instruction (∅ for last)
    IN[i]  = USE[i] ∪ (OUT[i] − DEF[i])

repeat until no liveIn/liveOut set changes
```

**Why iterative?** Even for a single basic block, inputs may include function parameters that appear before their first use; the backward pass correctly propagates them. Convergence is guaranteed because sets only grow (monotone) and are bounded by the finite variable universe.

**Why `std::set`?** Set difference (`OUT − DEF`) and union (`USE ∪ …`) map directly to `std::set_difference` / `insert`. The overhead is acceptable for the small variable counts in a single basic block (typically < 30).

---

### `InterferenceGraph` (`InterferenceGraph.h / .cpp`)

```cpp
class InterferenceGraph {
    std::map<std::string, std::set<std::string>> adjList;  // neighbour sets
    std::map<std::string, int>                   degree;   // current degree
    std::set<Edge>                               edges;    // canonical edge set
    std::vector<std::string>                     variables;
    size_t K; // number of available registers
};
```

**Edge insertion:** Edges are stored canonically (u < v lexicographically) in a `std::set<Edge>` to prevent duplicates. `addEdge(a, b)` is O(log E).

**Graph construction:** For each instruction i:
1. All pairs `(u, v)` in `liveOut[i]` get an interference edge.
2. Each defined variable `d ∈ DEF[i]` gets an edge to every variable in `liveOut[i]` (except itself), since `d` is being born while others are still alive.

---

### `RegisterAllocator` (`RegisterAllocator.h / .cpp`)

```cpp
class RegisterAllocator {
    InterferenceGraph&           graph;
    size_t                       K;
    std::map<std::string, int>   assignment;      // variable -> register index (-1 = spill)
    std::stack<std::string>      simplifyStack;
    std::set<std::string>        spillCandidates;
    std::vector<AllocationStep>  steps;           // step-by-step trace for frontend
    bool                         spillRequired;
};
```

**Chaitin's algorithm — detailed pseudocode:**

```
SIMPLIFY phase:
  workGraph = copy of interference graph
  repeat:
    if ∃ node v with degree(v) < K:
      push v onto simplifyStack
      remove v from workGraph
      record SIMPLIFY_PUSH step
    else if workGraph non-empty:
      spill = argmax degree(v) over remaining nodes
      push spill onto simplifyStack
      spillCandidates.insert(spill)
      remove spill from workGraph
      record SIMPLIFY_SPILL step
  until workGraph empty

ASSIGN phase:
  while simplifyStack not empty:
    v = pop()
    usedColors = { assignment[n] | n ∈ neighbors(v) in ORIGINAL graph, assignment[n] ≥ 0 }
    color = smallest c ∈ [0, K) not in usedColors
    if color found:
      assignment[v] = color
      record ASSIGN step
    else:
      assignment[v] = -1   // spill
      spillRequired = true
      record SPILL_DETECTED step

DETECT phase:
  if spillCandidates not empty: spillRequired = true
```

---

## DOT Output Format

The simulator generates three Graphviz DOT files:

| File | Contents |
|------|----------|
| `graphs/liveness.dot` | Directed sequence of instruction nodes, each labelled with USE/DEF/IN/OUT sets |
| `graphs/interference.dot` | Undirected graph with nodes colored by assigned register |
| `graphs/allocation.dot` | Same as interference.dot post-coloring |

Render with: `dot -Tsvg graphs/interference.dot -o interference.svg`

---

## JSON Output Schema (`graphs/analysis.json`)

```json
{
  "instructions":    [ { "id": 0, "text": "%1 = add i32 %a, %b" }, ... ],
  "cfg":             { "blocks": [...], "edges": [...] },
  "liveness":        {
    "iterations": 1,
    "instructions": [ { "id": 0, "use": [...], "def": [...], "liveIn": [...], "liveOut": [...] } ],
    "liveRanges":  { "%a": [0, 1], "%1": [1, 2] }
  },
  "interferenceGraph": {
    "K": 4,
    "variables": [...],
    "degrees":   { "%a": 2, ... },
    "edges":     [ { "source": "%a", "target": "%1" }, ... ]
  },
  "allocation": {
    "K": 4,
    "spillRequired": false,
    "assignment":    { "%a": { "register": 0, "name": "R1" }, ... },
    "spillCandidates": [],
    "steps": [...]
  },
  "timing": { "livenessUs": 12.5, "interferenceUs": 3.1, "coloringUs": 2.4 },
  "events": [...]
}
```

---

## Complexity Analysis

| Phase | Time Complexity | Space Complexity | Notes |
|-------|-----------------|-----------------|-------|
| IR Parsing | O(N) | O(N) | N = instruction count |
| Liveness Analysis | O(N × V) | O(N × V) | V = variable count; converges in 1–2 passes |
| Interference Graph Build | O(N × V²) | O(V²) | Worst case: all vars live simultaneously |
| Chaitin Simplify | O(V²) | O(V) | Each remove is O(V) × V iterations |
| Color Assignment | O(V × V) | O(V) | Per node: scan all neighbors |
| **Total** | **O(N × V²)** | **O(V²)** | Dominated by graph construction |

For typical single-block IR (N < 50, V < 30) the total is well under 1 ms.

---

## Build System

```
CMakeLists.txt   ->  rasim executable (C++17, STL only, no dependencies)
                      run_tests executable (unit test runner)
```

No external libraries are required. The build is self-contained and reproducible.
