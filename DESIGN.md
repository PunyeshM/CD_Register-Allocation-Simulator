# Design Document: Register Allocation Simulator

## Approach

The register allocation problem is modeled as a graph coloring problem based on Chaitin's algorithm. Our simulator processes an intermediate representation (IR) of the code and visually demonstrates how an optimal allocation is achieved.

The approach is divided into four main phases:

1. **IR Parsing**: 
   The system reads a simplified subset of LLVM IR representing a single basic block. We parse instructions like `add`, `sub`, `mul`, `load`, `store`, `phi`, and `ret`. For each instruction, we extract the definition (result) and the uses (operands) to build dataflow information.

2. **Liveness Analysis (Backward Dataflow)**:
   We calculate the live ranges for each variable. The simulator performs an iterative backward dataflow analysis over the basic block to compute the following sets for each instruction:
   - `USE`: Variables used before being redefined.
   - `DEF`: Variables defined (assigned) in the instruction.
   - `OUT`: Variables live immediately after the instruction (union of `IN` sets of successors).
   - `IN`: Variables live immediately before the instruction (`USE ∪ (OUT - DEF)`).

3. **Interference Graph Construction**:
   An undirected graph is built where each node represents a variable (virtual register), and an edge exists between two nodes if their live ranges overlap (i.e., both are in the same `OUT` set at any instruction). This graph represents the constraints of register allocation.

4. **Chaitin's Graph Coloring & Spill Detection**:
   We attempt to color the interference graph with `K` colors (representing physical registers). 
   - **Simplification**: Iteratively remove nodes with degree < `K` and push them onto a stack.
   - **Spill Candidate Selection**: If all remaining nodes have degree ≥ `K`, we select a spill candidate using a heuristic (highest degree node) and temporarily remove it to continue coloring.
   - **Assignment**: We pop nodes from the stack and assign the lowest possible color not used by its neighbors. Nodes that cannot be colored are marked as spilled.

## Alternatives Considered

1. **Linear Scan Register Allocation**:
   - *Description*: Allocates registers in a single pass over the linear sequence of instructions, assigning registers based on live intervals.
   - *Why rejected*: Linear scan is faster and often used in JIT compilers, but graph coloring produces better allocations with fewer spills for complex code structures. Furthermore, graph coloring is more visually intuitive for an educational simulator, which is a primary goal of this project.

2. **Greedy Register Allocation (LLVM style)**:
   - *Description*: LLVM uses a greedy allocator based on live interval splitting instead of full graph coloring.
   - *Why rejected*: A greedy approach combined with live interval splitting is highly complex and depends on the entire function's CFG. Our simulator targets a single basic block to clearly illustrate the theoretical graph coloring concept (Chaitin's approach) before delving into production-scale complexities.

3. **Integer Linear Programming (ILP)**:
   - *Description*: Formulate register allocation as an optimization problem and solve using an ILP solver.
   - *Why rejected*: Optimal but NP-hard and exceptionally slow. It doesn't scale well and isn't useful for a real-time interactive simulator where step-by-step algorithms are needed.

## Conclusion

Chaitin's graph coloring provides an excellent balance of generating near-optimal allocations while being conceptually clear and mathematically robust to visualize via our interactive frontend.
