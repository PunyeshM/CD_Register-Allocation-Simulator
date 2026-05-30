// ============================================================
// ColoringAgent.ts — Register coloring explainer
// ============================================================
import { AllocationStep, InterferenceGraphData, AgentExplanation } from "@/types"

const REG_NAMES = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]

export class ColoringAgent {
  private steps: AllocationStep[]
  private graph: InterferenceGraphData

  constructor(steps: AllocationStep[], graph: InterferenceGraphData) {
    this.steps = steps
    this.graph = graph
  }

  explainStep(stepIndex: number): AgentExplanation {
    const step = this.steps[stepIndex]
    if (!step) return this.notFound(stepIndex)

    switch (step.type) {
      case "SIMPLIFY_PUSH":
        return this.explainSimplifyPush(step)
      case "SIMPLIFY_SPILL":
        return this.explainSimplifySpill(step)
      case "ASSIGN":
        return this.explainAssign(step)
      case "SPILL_DETECTED":
        return this.explainSpillDetected(step)
    }
  }

  private explainSimplifyPush(step: AllocationStep): AgentExplanation {
    const degree = this.graph.degrees[step.variable] ?? 0
    const K = this.graph.K
    const neighbors = this.graph.edges
      .filter(e => e.source === step.variable || e.target === step.variable)
      .map(e => e.source === step.variable ? e.target : e.source)

    return {
      agent: "coloring",
      subject: step.variable,
      title: `Simplify: Push ${step.variable}`,
      text: `${step.variable} has degree ${degree} in the interference graph, which is less than K=${K}. This means it has at most ${degree} neighbors that could block its color choice, but with ${K} colors available, we can always find a valid color for it. So it is safe to temporarily remove it from the graph and push it onto the coloring stack.`,
      detail: `Neighbors: [${neighbors.join(", ")}]. When ${step.variable} is popped from the stack later, at most ${degree} colors will be blocked by its neighbors, leaving at least ${K - degree} color${K - degree !== 1 ? "s" : ""} free.`,
      tips: [
        `The order of the stack determines the order of color assignment. ${step.variable} will be colored after all nodes pushed after it.`,
        `Nodes with lower degree are always safe to simplify — this is the core of Chaitin's algorithm.`,
      ],
      relatedVariables: neighbors,
      confidence: "high",
    }
  }

  private explainSimplifySpill(step: AllocationStep): AgentExplanation {
    const degree = this.graph.degrees[step.variable] ?? 0
    const K = this.graph.K

    return {
      agent: "coloring",
      subject: step.variable,
      title: `Spill Candidate: ${step.variable}`,
      text: `At this point in simplification, every remaining variable has degree ≥ K=${K}. This means we cannot guarantee a valid color for any of them. ${step.variable} was chosen as a spill candidate because it has the highest degree (${degree}) — the heuristic reasoning is that high-degree nodes are most likely to cause coloring conflicts.`,
      detail: `${step.variable} is pushed onto the stack anyway. During color assignment (pop phase), we will try to color it. If we succeed, it was an "optimistic" success. If not, it must be spilled to memory.`,
      tips: [
        `Different spill heuristics exist: highest degree, lowest use count, longest live range. This implementation uses highest degree.`,
        `Spill candidates are not always actually spilled — they may succeed during color assignment if enough neighbors have been colored with different registers.`,
      ],
      confidence: "high",
    }
  }

  private explainAssign(step: AllocationStep): AgentExplanation {
    const K = this.graph.K
    const neighbors = this.graph.edges
      .filter(e => e.source === step.variable || e.target === step.variable)
      .map(e => e.source === step.variable ? e.target : e.source)

    const usedColors = neighbors
      .map(n => step.currentAssignment[n])
      .filter(c => c !== undefined && c >= 0)
      .filter((c, i, arr) => arr.indexOf(c) === i)

    if (step.registerId >= 0) {
      const regName = REG_NAMES[step.registerId] || `R${step.registerId + 1}`
      const blockedRegs = usedColors.map(c => REG_NAMES[c] || `R${c + 1}`)
      return {
        agent: "coloring",
        subject: step.variable,
        title: `${step.variable} → ${regName}`,
        text: `${step.variable} is popped from the stack and assigned ${regName} (color ${step.registerId}). Its neighbors occupy register${blockedRegs.length !== 1 ? "s" : ""} [${blockedRegs.join(", ") || "none"}], so ${regName} is the lowest-numbered free register.`,
        detail: `Neighbor assignments at this point: ${neighbors.map(n => `${n}=${REG_NAMES[step.currentAssignment[n]] || "unassigned"}`).join(", ")}`,
        tips: blockedRegs.length === K - 1 ? [
          `${step.variable} barely avoided a spill — all other registers were blocked!`,
        ] : undefined,
        relatedVariables: neighbors,
        confidence: "high",
      }
    } else {
      return {
        agent: "coloring",
        subject: step.variable,
        title: `${step.variable} → SPILL`,
        text: `${step.variable} cannot be colored: all ${K} registers (${REG_NAMES.slice(0, K).join(", ")}) are occupied by interfering neighbors. ${step.variable} must be spilled to memory.`,
        detail: `Neighbors: [${neighbors.join(", ")}]. All ${K} registers are blocked by their assignments.`,
        tips: [
          `To avoid this spill, you could: (1) increase K, (2) reorder/merge variables to reduce live ranges, or (3) use register coalescing.`,
        ],
        relatedVariables: neighbors,
        confidence: "high",
      }
    }
  }

  private explainSpillDetected(step: AllocationStep): AgentExplanation {
    return {
      agent: "coloring",
      subject: step.variable,
      title: `Spill Confirmed: ${step.variable}`,
      text: `${step.variable} has been confirmed as a spill. This variable will need to be stored in memory (on the stack) and reloaded each time it is used. This incurs memory access overhead.`,
      detail: `In real compilers, spill code is inserted: a store before each definition and a load before each use of the spilled variable.`,
      tips: [
        `Spilling increases code size and execution time. Compilers try hard to minimize spills.`,
        `With K=${this.graph.K} registers, the interference graph is not ${this.graph.K}-colorable — a fundamental constraint.`,
      ],
      confidence: "high",
    }
  }

  explainColoringOrder(stack: string[]): AgentExplanation {
    return {
      agent: "coloring",
      subject: "stack",
      title: "Coloring Stack Order",
      text: `The simplification stack contains variables in the order they were removed from the graph. Colors are assigned by popping from the top (reverse order). The top of the stack is assigned last among the "pushed" nodes, giving it the most constrained coloring context.`,
      detail: `Stack (bottom to top): [${stack.join(" → ")}]`,
      confidence: "high",
    }
  }

  private notFound(index: number): AgentExplanation {
    return {
      agent: "coloring",
      subject: `step-${index}`,
      title: "Step Not Found",
      text: `No allocation step at index ${index}.`,
      confidence: "low",
    }
  }
}
