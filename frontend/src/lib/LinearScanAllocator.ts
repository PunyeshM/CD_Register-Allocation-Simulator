// ============================================================
// LinearScanAllocator.ts — Linear Scan Register Allocation
// ============================================================
import {
  ParsedInstruction,
  LiveSet,
  InterferenceGraphData,
  AllocationResult,
  AllocationStep,
  LiveInterval,
  AlgorithmComparisonResult,
} from "@/types"

export class LinearScanAllocator {
  private instructions: ParsedInstruction[]
  private liveSets: LiveSet[]
  private K: number

  constructor(instructions: ParsedInstruction[], liveSets: LiveSet[], K: number) {
    this.instructions = instructions
    this.liveSets = liveSets
    this.K = K
  }

  computeIntervals(): LiveInterval[] {
    const intervalMap = new Map<string, { start: number; end: number }>()

    for (let i = 0; i < this.liveSets.length; i++) {
      const s = this.liveSets[i]
      const vars = new Set([...s.liveIn, ...s.liveOut, ...s.use, ...s.def])
      for (const v of vars) {
        if (!intervalMap.has(v)) {
          intervalMap.set(v, { start: i, end: i })
        } else {
          const curr = intervalMap.get(v)!
          intervalMap.set(v, { start: Math.min(curr.start, i), end: Math.max(curr.end, i) })
        }
      }
    }

    return Array.from(intervalMap.entries())
      .map(([variable, { start, end }]) => ({
        variable,
        start,
        end,
        register: -1,
        registerName: "SPILL",
      }))
      .sort((a, b) => a.start - b.start)
  }

  allocate(): AlgorithmComparisonResult {
    const intervals = this.computeIntervals()
    const regNames = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]
    const steps: AllocationStep[] = []
    const assignment: Record<string, { register: number; name: string }> = {}
    const spillCandidates: string[] = []

    // Available register pool
    const freeRegs = Array.from({ length: this.K }, (_, i) => i)
    const active: LiveInterval[] = []

    const expireOldIntervals = (current: LiveInterval) => {
      const toRemove: LiveInterval[] = []
      for (const ai of active) {
        if (ai.end < current.start) {
          toRemove.push(ai)
          freeRegs.push(ai.register)
          freeRegs.sort((a, b) => a - b)
        }
      }
      for (const r of toRemove) {
        active.splice(active.indexOf(r), 1)
      }
    }

    const spillAtInterval = (current: LiveInterval) => {
      // Spill the interval with the largest end point
      const spillTarget = active.reduce((prev, curr) =>
        curr.end > prev.end ? curr : prev
      , active[0])

      if (spillTarget && spillTarget.end > current.end) {
        // Spill spillTarget, give its register to current
        current.register = spillTarget.register
        current.registerName = regNames[current.register] || `R${current.register + 1}`
        spillTarget.register = -1
        spillTarget.registerName = "SPILL"
        spillCandidates.push(spillTarget.variable)
        active.splice(active.indexOf(spillTarget), 1)
        active.push(current)
        active.sort((a, b) => a.end - b.end)

        steps.push({
          type: "SIMPLIFY_SPILL",
          variable: spillTarget.variable,
          registerId: -1,
          message: `SPILL ${spillTarget.variable} (live range extends further, freeing reg for ${current.variable})`,
          currentAssignment: Object.fromEntries(Object.entries(assignment).map(([k, v]) => [k, v.register])),
          currentStack: [],
          spillCandidates: [...spillCandidates],
          remainingGraph: {},
        })
      } else {
        // Spill current
        current.register = -1
        current.registerName = "SPILL"
        spillCandidates.push(current.variable)
        steps.push({
          type: "SIMPLIFY_SPILL",
          variable: current.variable,
          registerId: -1,
          message: `SPILL ${current.variable} (no register available)`,
          currentAssignment: Object.fromEntries(Object.entries(assignment).map(([k, v]) => [k, v.register])),
          currentStack: [],
          spillCandidates: [...spillCandidates],
          remainingGraph: {},
        })
      }
    }

    for (const interval of intervals) {
      expireOldIntervals(interval)

      if (freeRegs.length === 0) {
        spillAtInterval(interval)
      } else {
        interval.register = freeRegs.shift()!
        interval.registerName = regNames[interval.register] || `R${interval.register + 1}`
        active.push(interval)
        active.sort((a, b) => a.end - b.end)
        steps.push({
          type: "ASSIGN",
          variable: interval.variable,
          registerId: interval.register,
          message: `ASSIGN ${interval.variable} → ${interval.registerName} (interval [${interval.start}, ${interval.end}])`,
          currentAssignment: Object.fromEntries(
            intervals.filter(i => i.register >= 0).map(i => [i.variable, i.register])
          ),
          currentStack: [],
          spillCandidates: [...spillCandidates],
          remainingGraph: {},
        })
      }
    }

    // Build final assignment
    for (const interval of intervals) {
      assignment[interval.variable] = {
        register: interval.register,
        name: interval.registerName,
      }
      if (interval.register < 0 && !spillCandidates.includes(interval.variable)) {
        spillCandidates.push(interval.variable)
      }
    }

    const usedRegs = new Set(intervals.filter(i => i.register >= 0).map(i => i.register))

    return {
      mode: "LINEAR_SCAN",
      label: "Linear Scan",
      spillCount: spillCandidates.length,
      stepCount: steps.length,
      registerUtilization: usedRegs.size / this.K,
      assignment,
      spillCandidates,
      steps,
    }
  }
}
