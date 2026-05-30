# Design Document: Register Allocation Simulator

## Overview

The Register Allocation Simulator implements **Chaitin's graph-coloring algorithm** for a single basic block of LLVM IR. The system transforms raw IR text into a physical register assignment (or a clear spill-required verdict) through four sequential, verifiable phases.

---

## Algorithm Design

### Phase 1 — LLVM IR Parsing

The simulator reads a simplified subset of LLVM IR representing **one basic block only**. Enforcing a single basic block is a deliberate constraint: it eliminates the need for a full CFG liveness merge (ϕ-node resolution, loop-carried values) and keeps the educational focus on the core allocation algorithm.

**Supported instructions:**

| Opcode | Example | DEF | USE |
|--------|---------|-----|-----|
| `add`  | `%1 = add i32 %a, %b` | `%1` | `%a`, `%b` |
| `sub`  | `%2 = sub i32 %1, %c` | `%2` | `%1`, `%c` |
| `mul`  | `%3 = mul i32 %2, %d` | `%3` | `%2`, `%d` |
| `load` | `%p = load i32* %ptr` | `%p` | `%ptr` |
| `store`| `store i32 %v, i32* %p` | — | `%v`, `%p` |
| `phi`  | `%r = phi i32 [%a,…]` | `%r` | all `%` tokens |
| `ret`  | `ret i32 %3` | — | `%3` |

Variables are identified by the `%` prefix (SSA convention). Constants and type tokens are ignored.

### Phase 2 — Backward Liveness Analysis

We perform iterative **backward dataflow analysis** to compute, for each instruction `i`:

```
USE[i]  = variables read by i before being defined
DEF[i]  = variables written by i
OUT[i]  = ⋃ IN[s]   for all successors s of i
IN[i]   = USE[i] ∪ (OUT[i] − DEF[i])
```

For a single basic block the only successor of instruction `i` is instruction `i+1`, so:

```
OUT[i] = IN[i+1]     (OUT[last] = ∅)
```

The loop iterates until no set changes (convergence). In practice it converges in **one pass** for straight-line code.

### Phase 3 — Interference Graph Construction

An undirected graph `G = (V, E)` is constructed where:
- **V** = one node per SSA variable  
- **E** = an edge `(u, v)` iff `u` and `v` are simultaneously live at any program point

Two variables are simultaneously live when they both appear in the same `OUT[i]` set, or when one is defined (`DEF[i]`) while the other is in `OUT[i]`.

### Phase 4 — Chaitin Graph Coloring + Spill Detection

Given K physical registers (colors):

1. **Simplify** — while a node `v` with `degree(v) < K` exists: remove it from the graph and push onto the simplification stack.
2. **Spill Candidate** — if all remaining nodes have degree ≥ K: select the node with maximum degree as a potential spill candidate, push it to the stack, remove it, and continue simplifying.
3. **Assign Colors** — pop nodes off the stack. For each node, assign the lowest-indexed color not used by any already-colored neighbor.
4. **Detect Spills** — if a node cannot be colored (all K colors taken by neighbors), mark it as a **spill candidate**. Output verdict: `SPILL REQUIRED`.
5. **Output** — if no spills occurred, print the complete register assignment table.

> **Important**: This simulator detects spills and reports which variables would need to be spilled. It does **not** implement the actual spill insertion (load/store generation), which is a separate compiler pass beyond this scope.

---

## Alternatives Considered

### 1. Linear Scan Register Allocation

- **Description**: Single left-to-right pass over live intervals. Variables are assigned registers greedily by interval start/end.
- **Complexity**: O(N log N) — significantly faster than graph coloring.
- **Why rejected**: Linear scan can over-estimate interference for variables with "holes" in their live ranges. It is less accurate than graph coloring for complex intra-block dependencies, and less visually intuitive for step-by-step educational demonstration.

### 2. LLVM Greedy Allocator (default since LLVM 3.0)

- **Description**: Operates on the full SSA-based virtual register file across all basic blocks. Uses live interval splitting, register class constraints, and a priority queue (eviction heuristics).
- **Why rejected**: Requires full CFG traversal, SSA deconstruction, and register class modeling — far beyond a single-block educational scope.

### 3. Integer Linear Programming (ILP)

- **Description**: Optimal allocation via ILP solver. Provably minimizes spills.
- **Why rejected**: NP-hard in general. No practical step-by-step visualization. Not suitable for interactive simulation.

---

## Comparison with LLVM Allocators

| Feature | **This Simulator** (Chaitin) | **LLVM Linear Scan** | **LLVM Greedy** |
|---------|------------------------------|----------------------|-----------------|
| **Algorithm** | Graph coloring (Chaitin 1981) | Interval scan (Poletto 1999) | Greedy + splitting (LLVM 2011) |
| **Scope** | Single basic block | Whole function | Whole function |
| **Spill strategy** | Highest-degree heuristic | Furthest-endpoint eviction | Live-range splitting + remat |
| **Coalescing** | Not implemented | Limited | Full coalescing |
| **SSA handling** | Simple `%`-variable SSA | Full SSA deconstruction | Full SSA + liveness |
| **Live range holes** | Not modeled | Not modeled | Modeled (splitting) |
| **Time complexity** | O(V²) per block | O(N log N) | O(N log N) + heuristics |
| **Spill quality** | Near-optimal for single block | Good (misses holes) | Best in practice |
| **Implementation complexity** | Low — educational | Medium | High — production |
| **Ideal use case** | Teaching, visualization | JIT compilers | AOT production compilers |

### Tradeoff Summary

**Speed vs. Quality**: Linear scan is fastest but sacrifices spill quality for variables with live-range holes (it treats a variable as live across its entire interval even if it is not used in some sub-ranges). Chaitin's coloring is more precise because it uses the actual interference structure. LLVM's greedy allocator achieves the best spill quality by additionally splitting live ranges — a technique unavailable in either pure linear scan or basic graph coloring.

**Complexity vs. Correctness**: Chaitin's algorithm is NP-complete in the general case (graph coloring is NP-hard), but in practice the simplification heuristic (removing low-degree nodes) converges quickly for typical compiler IR. LLVM's greedy allocator trades theoretical optimality for practical O(N log N) performance via priority-based greedy assignment with live-range splitting as a fallback.

**Educational value**: Graph coloring is the canonical algorithm taught in compiler courses because it directly maps register allocation to a well-understood mathematical structure. This simulator makes every step — USE/DEF computation, liveness convergence, edge insertion, stack simplification, and color assignment — visible and verifiable.

---

## Conclusion

Chaitin's graph coloring provides an excellent balance of near-optimal register allocation and algorithmic clarity. For a single basic block it is both tractable and fully verifiable, making it the ideal algorithm for an interactive educational simulator.
