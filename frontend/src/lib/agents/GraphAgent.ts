// ============================================================
// GraphAgent.ts — Interference graph structure explainer
// ============================================================
import { InterferenceGraphData, ParsedInstruction, LiveSet, AgentExplanation } from "@/types"

export class GraphAgent {
  private graph: InterferenceGraphData
  private instructions: ParsedInstruction[]
  private liveSets: LiveSet[]

  constructor(graph: InterferenceGraphData, instructions: ParsedInstruction[], liveSets: LiveSet[]) {
    this.graph = graph
    this.instructions = instructions
    this.liveSets = liveSets
  }

  explainEdge(u: string, v: string): AgentExplanation {
    // Find where both are simultaneously live
    const simultaneousAt: number[] = []
    for (let i = 0; i < this.liveSets.length; i++) {
      const s = this.liveSets[i]
      const uLive = s.liveIn.includes(u) || s.liveOut.includes(u) || s.use.includes(u) || s.def.includes(u)
      const vLive = s.liveIn.includes(v) || s.liveOut.includes(v) || s.use.includes(v) || s.def.includes(v)
      if (uLive && vLive) simultaneousAt.push(i)
    }

    const firstPoint = simultaneousAt[0]
    const firstInst = firstPoint !== undefined ? this.instructions[firstPoint] : null

    return {
      agent: "graph",
      subject: `${u}–${v}`,
      title: `Interference: ${u} ↔ ${v}`,
      text: `${u} and ${v} interfere because they are simultaneously live at ${simultaneousAt.length} instruction${simultaneousAt.length !== 1 ? "s" : ""}${firstInst ? `, starting at instruction ${firstPoint} ("${firstInst.text}")` : ""}. Since they cannot occupy the same register at the same time, they must receive different colors.`,
      detail: `Simultaneously live at instructions: [${simultaneousAt.join(", ")}]`,
      tips: [
        `If either variable's live range could be shortened to not overlap with the other, this interference edge could be eliminated.`,
        `Interfering variables can be coalesced if they are connected by a copy instruction and this doesn't create additional interferences.`,
      ],
      relatedVariables: [u, v],
      confidence: "high",
    }
  }

  explainNode(variable: string): AgentExplanation {
    const degree = this.graph.degrees[variable] ?? 0
    const K = this.graph.K
    const neighbors = this.graph.edges
      .filter(e => e.source === variable || e.target === variable)
      .map(e => e.source === variable ? e.target : e.source)

    const chromaRisk = degree >= K ? "high" : degree >= K - 1 ? "medium" : "low"

    return {
      agent: "graph",
      subject: variable,
      title: `Graph Node: ${variable} (degree ${degree})`,
      text: `${variable} has ${degree} interference edge${degree !== 1 ? "s" : ""} in the graph, connecting it to: [${neighbors.join(", ")}]. With K=${K} registers, ${variable} ${degree < K ? "can always be safely colored (degree < K)" : `presents a coloring challenge (degree ${degree} ≥ K=${K})`}.`,
      detail: `Spill risk: ${chromaRisk.toUpperCase()}. A node with degree ≥ K cannot be guaranteed a color, but may still succeed during assignment (optimistic coloring).`,
      tips: degree >= K ? [
        `${variable} is a high-risk node. If it cannot be colored, it will be spilled to memory.`,
        `Reducing its live range would lower its degree and eliminate some interference edges.`,
      ] : [
        `${variable} is a safe node — it will always receive a register as long as it hasn't been forced into an impossible coloring by its neighbors.`,
      ],
      relatedVariables: neighbors,
      confidence: "high",
    }
  }

  explainGraphStructure(): AgentExplanation {
    const K = this.graph.K
    const n = this.graph.variables.length
    const e = this.graph.edges.length
    const maxDeg = Math.max(...Object.values(this.graph.degrees), 0)
    const avgDeg = n > 0 ? (e * 2 / n).toFixed(1) : "0"
    const highDegNodes = this.graph.variables.filter(v => (this.graph.degrees[v] ?? 0) >= K)
    const density = n > 1 ? ((2 * e) / (n * (n - 1)) * 100).toFixed(1) : "0"

    return {
      agent: "graph",
      subject: "graph",
      title: "Interference Graph Overview",
      text: `The interference graph has ${n} node${n !== 1 ? "s" : ""} (variables) and ${e} edge${e !== 1 ? "s" : ""} (interferences). Maximum degree is ${maxDeg}, average degree is ${avgDeg}. Graph density is ${density}%.`,
      detail: `${highDegNodes.length > 0 ? `High-degree nodes (degree ≥ K=${K}): [${highDegNodes.join(", ")}]` : `All nodes have degree < K=${K} — the graph is trivially K-colorable!`}`,
      tips: [
        `A denser interference graph means more register pressure and more potential spills.`,
        `The chromatic number of the graph must be ≤ K for spill-free allocation.`,
        `This graph is ${highDegNodes.length === 0 ? `K-colorable — no spills needed.` : `potentially not K-colorable — spills are likely.`}`,
      ],
      confidence: "high",
    }
  }

  explainChromaticNumber(): AgentExplanation {
    const K = this.graph.K
    const spillCandidates = this.graph.variables.filter(v => (this.graph.degrees[v] ?? 0) >= K)
    const lowerBound = Math.max(0, ...Object.values(this.graph.degrees).map(d => d + 1))
    // Clique detection (simple heuristic: max clique size approximation)
    const cliqueHint = Math.min(lowerBound, this.graph.variables.length)

    return {
      agent: "graph",
      subject: "chromatic",
      title: "Chromatic Number Analysis",
      text: `The chromatic number χ(G) is the minimum number of colors needed to color the interference graph such that no two adjacent nodes share a color. For K=${K} registers, we need χ(G) ≤ K. The clique lower bound suggests χ(G) ≥ ${Math.min(cliqueHint, K + (spillCandidates.length > 0 ? 1 : 0))}.`,
      detail: `Computing the exact chromatic number is NP-complete. Chaitin's algorithm provides a practical heuristic approximation.`,
      tips: [
        `If χ(G) > K, spills are unavoidable. If χ(G) ≤ K, the graph is colorable.`,
        `Chaitin's algorithm may produce spills even when the graph is technically K-colorable — it's a heuristic, not optimal.`,
      ],
      confidence: "medium",
    }
  }
}
