// ============================================================
// OptimisticColoringAllocator.ts — Optimistic Graph Coloring
// ============================================================
import {
  InterferenceGraphData,
  AllocationStep,
  AlgorithmComparisonResult,
} from "@/types"

/**
 * Optimistic Coloring (Briggs variant):
 * Like Chaitin but marks spill candidates WITHOUT removing them immediately.
 * After simplification, it tries to color optimistic candidates too.
 * This often results in fewer actual spills than conservative Chaitin.
 */
export class OptimisticColoringAllocator {
  private graph: InterferenceGraphData

  constructor(graph: InterferenceGraphData) {
    this.graph = graph
  }

  allocate(): AlgorithmComparisonResult {
    const K = this.graph.K
    const regNames = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]
    const steps: AllocationStep[] = []
    const spillCandidates: string[] = []
    const assignment: Record<string, { register: number; name: string }> = {}

    // Build adjacency list
    const adjList: Record<string, string[]> = {}
    for (const v of this.graph.variables) {
      adjList[v] = this.graph.edges
        .filter(e => e.source === v || e.target === v)
        .map(e => e.source === v ? e.target : e.source)
    }

    // Working copy
    const tempAdj: Record<string, Set<string>> = {}
    for (const v of this.graph.variables) {
      tempAdj[v] = new Set(adjList[v] || [])
    }

    const stack: string[] = []
    const optimisticCandidates = new Set<string>()
    let remaining = new Set(this.graph.variables)

    const getDeg = (v: string) => tempAdj[v]?.size || 0

    // Simplification — optimistic: always push, mark high-degree as "optimistic"
    while (remaining.size > 0) {
      let found = false

      // Try to find node with degree < K first
      for (const v of remaining) {
        if (getDeg(v) < K) {
          stack.push(v)
          steps.push({
            type: "SIMPLIFY_PUSH",
            variable: v,
            registerId: -1,
            message: `PUSH ${v} (degree ${getDeg(v)} < K=${K})`,
            currentAssignment: {},
            currentStack: [...stack],
            spillCandidates: Array.from(optimisticCandidates),
            remainingGraph: {},
          })
          for (const n of tempAdj[v] || []) tempAdj[n]?.delete(v)
          delete tempAdj[v]
          remaining.delete(v)
          found = true
          break
        }
      }

      if (!found) {
        // Optimistic: push anyway (don't actually spill yet, just mark)
        let maxDeg = -1
        let candidate = ""
        for (const v of remaining) {
          if (getDeg(v) > maxDeg) { maxDeg = getDeg(v); candidate = v }
        }
        if (candidate) {
          optimisticCandidates.add(candidate)
          stack.push(candidate)
          steps.push({
            type: "SIMPLIFY_SPILL",
            variable: candidate,
            registerId: -1,
            message: `OPTIMISTIC PUSH ${candidate} (degree ${maxDeg} >= K=${K}) — will try to color anyway`,
            currentAssignment: {},
            currentStack: [...stack],
            spillCandidates: Array.from(optimisticCandidates),
            remainingGraph: {},
          })
          for (const n of tempAdj[candidate] || []) tempAdj[n]?.delete(candidate)
          delete tempAdj[candidate]
          remaining.delete(candidate)
        } else break
      }
    }

    // Color assignment — pop stack
    const colorMap: Record<string, number> = {}
    const revStack = [...stack].reverse()

    for (const v of revStack) {
      const usedColors = new Set<number>()
      for (const n of adjList[v] || []) {
        if (colorMap[n] !== undefined && colorMap[n] >= 0) usedColors.add(colorMap[n])
      }

      let color = -1
      for (let c = 0; c < K; c++) {
        if (!usedColors.has(c)) { color = c; break }
      }

      colorMap[v] = color
      const regStr = color >= 0 ? regNames[color] || `R${color + 1}` : "SPILL"

      if (color >= 0) {
        // Optimistic success — even a "candidate" got colored
        steps.push({
          type: "ASSIGN",
          variable: v,
          registerId: color,
          message: `ASSIGN ${v} → ${regStr}${optimisticCandidates.has(v) ? " (optimistically colored!)" : ""}`,
          currentAssignment: { ...colorMap },
          currentStack: [],
          spillCandidates: [...spillCandidates],
          remainingGraph: {},
        })
      } else {
        spillCandidates.push(v)
        steps.push({
          type: "SPILL_DETECTED",
          variable: v,
          registerId: -1,
          message: `SPILL ${v} — even optimistic coloring failed`,
          currentAssignment: { ...colorMap },
          currentStack: [],
          spillCandidates: [...spillCandidates],
          remainingGraph: {},
        })
      }

      assignment[v] = {
        register: color,
        name: regStr,
      }
    }

    const usedRegs = new Set(Object.values(colorMap).filter(c => c >= 0))

    return {
      mode: "OPTIMISTIC",
      label: "Optimistic Coloring",
      spillCount: spillCandidates.length,
      stepCount: steps.length,
      registerUtilization: usedRegs.size / K,
      assignment,
      spillCandidates,
      steps,
    }
  }
}
