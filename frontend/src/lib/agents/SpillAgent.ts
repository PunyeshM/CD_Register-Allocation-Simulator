// ============================================================
// SpillAgent.ts — Register spill explainer
// ============================================================
import { InterferenceGraphData, PressurePoint, AgentExplanation } from "@/types"

export class SpillAgent {
  private graph: InterferenceGraphData
  private pressureTimeline: PressurePoint[]

  constructor(graph: InterferenceGraphData, pressureTimeline: PressurePoint[]) {
    this.graph = graph
    this.pressureTimeline = pressureTimeline
  }

  explainSpill(variable: string): AgentExplanation {
    const K = this.graph.K
    const neighbors = this.graph.edges
      .filter(e => e.source === variable || e.target === variable)
      .map(e => e.source === variable ? e.target : e.source)
    const degree = this.graph.degrees[variable] ?? 0

    const peakPressure = Math.max(...this.pressureTimeline.map(p => p.pressure))
    const spillPoints = this.pressureTimeline.filter(p => p.isSpillPoint)

    const tips: string[] = [
      `Reduce the live range of ${variable} by moving its definition closer to its uses.`,
      `Consider splitting ${variable}'s live range if it's not used in all regions.`,
      `Increasing K from ${K} to ${K + 1} might eliminate this spill.`,
    ]

    if (degree >= K) {
      return {
        agent: "spill",
        subject: variable,
        title: `Why ${variable} Was Spilled`,
        text: `${variable} has degree ${degree} in the interference graph, meaning it interferes with ${degree} other variables. With only K=${K} registers available, and all ${degree} neighbors potentially needing different registers, there are not enough colors for ${variable}.`,
        detail: `Interfering neighbors: [${neighbors.join(", ")}]. Peak register pressure in this program is ${peakPressure} simultaneous live variables vs. K=${K} available registers.`,
        tips,
        relatedVariables: neighbors,
        confidence: "high",
      }
    }

    return {
      agent: "spill",
      subject: variable,
      title: `${variable} Spill Analysis`,
      text: `${variable} (degree ${degree}) was marked as a potential spill candidate during simplification because at that point, no variable with degree < K=${K} was available. During actual color assignment, all K registers were occupied by its neighbors.`,
      detail: `Interfering neighbors: [${neighbors.join(", ")}].`,
      tips,
      relatedVariables: neighbors,
      confidence: "high",
    }
  }

  explainPressureAtInstruction(instructionId: number): AgentExplanation {
    const point = this.pressureTimeline[instructionId]
    if (!point) {
      return {
        agent: "spill",
        subject: `I${instructionId}`,
        title: "Instruction Not Found",
        text: `No pressure data for instruction ${instructionId}.`,
        confidence: "low",
      }
    }

    const K = this.graph.K
    const isOverflow = point.pressure > K

    return {
      agent: "spill",
      subject: `I${instructionId}`,
      title: `Register Pressure at I${instructionId}: ${point.pressure}/${K}`,
      text: isOverflow
        ? `At instruction ${instructionId} ("${point.instructionText}"), ${point.pressure} variables are simultaneously live but only K=${K} registers are available. This is a pressure hotspot — ${point.pressure - K} variable(s) cannot be in registers simultaneously.`
        : `At instruction ${instructionId} ("${point.instructionText}"), ${point.pressure} of ${K} registers are in use. Register pressure is within safe bounds.`,
      detail: `Live variables: [${point.liveVariables.join(", ")}]`,
      tips: isOverflow ? [
        `This is where spills occur. Variables that live across this high-pressure point are prime spill candidates.`,
        `Re-ordering instructions or splitting live ranges can reduce pressure at this point.`,
      ] : undefined,
      confidence: "high",
    }
  }

  explainOverallPressure(): AgentExplanation {
    const K = this.graph.K
    const peakPoint = this.pressureTimeline.reduce(
      (max, p) => p.pressure > max.pressure ? p : max,
      this.pressureTimeline[0] || { pressure: 0, instructionText: "", liveVariables: [], instructionId: 0, isSpillPoint: false }
    )
    const avgPressure = this.pressureTimeline.length > 0
      ? (this.pressureTimeline.reduce((s, p) => s + p.pressure, 0) / this.pressureTimeline.length).toFixed(1)
      : "0"
    const spillCount = this.graph.variables.filter(v => {
      return this.pressureTimeline.some(p => p.liveVariables.includes(v) && p.pressure > K)
    }).length

    return {
      agent: "spill",
      subject: "overall",
      title: "Register Pressure Overview",
      text: `Peak register pressure is ${peakPoint.pressure} at instruction ${peakPoint.instructionId} ("${peakPoint.instructionText}"), which ${peakPoint.pressure > K ? `exceeds K=${K} — causing spills` : `is within K=${K} — no spills needed`}. Average pressure is ${avgPressure}/${K}.`,
      detail: `${spillCount} variable${spillCount !== 1 ? "s" : ""} live during high-pressure regions.`,
      tips: peakPoint.pressure > K ? [
        `Consider restructuring code to reduce simultaneous live variables at I${peakPoint.instructionId}.`,
        `Variables live across high-pressure points are the best spill candidates.`,
      ] : [
        `Register pressure stays within K=${K} — this program allocates cleanly!`,
      ],
      confidence: "high",
    }
  }

  suggestOptimizations(spillCandidates: string[]): AgentExplanation {
    const K = this.graph.K
    if (spillCandidates.length === 0) {
      return {
        agent: "spill",
        subject: "optimization",
        title: "No Spills — Optimal Allocation!",
        text: `All ${this.graph.variables.length} variables were successfully allocated to ${K} registers with no spills. The interference graph is K-colorable.`,
        confidence: "high",
      }
    }

    const tips = [
      `Increase K from ${K} to ${K + spillCandidates.length}: directly eliminates all spills but requires more physical registers.`,
      `Shorten live ranges: move definitions closer to their uses to reduce interference.`,
      `Use register coalescing: merge variables with non-overlapping ranges to share a register.`,
      `Optimize instruction order to reduce simultaneous live variables.`,
      `Consider loop-invariant code motion to move definitions outside hot loops.`,
    ]

    return {
      agent: "spill",
      subject: "optimization",
      title: `${spillCandidates.length} Spill${spillCandidates.length > 1 ? "s" : ""} Detected — Optimization Suggestions`,
      text: `Variables ${spillCandidates.join(", ")} could not be assigned registers and must be spilled to memory. Each spill means extra load/store instructions around every use, degrading performance.`,
      detail: `With K=${K}, the graph is not K-colorable. The chromatic number appears to be at least ${K + 1}.`,
      tips,
      relatedVariables: spillCandidates,
      confidence: "high",
    }
  }
}
