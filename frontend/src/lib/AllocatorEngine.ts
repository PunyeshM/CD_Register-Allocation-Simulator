// ============================================================
// AllocatorEngine.ts — Core engine with Event emission
// ============================================================
import {
  AnalysisResult,
  ParsedInstruction,
  Opcode,
  LiveSet,
  LivenessIteration,
  AllocationStep,
  AllocationResult,
  InterferenceGraphData,
  SimulationEvent,
  PressurePoint,
  VariableLifecycle,
  VariableEvent,
  MachineInstruction,
} from "@/types"
import { EventStore } from "./EventEngine"

export class AllocatorEngine {
  ir: string
  instructions: ParsedInstruction[] = []
  liveSets: LiveSet[] = []
  liveIterations: LivenessIteration[] = []
  liveRanges: Record<string, number[]> = {}
  graph: InterferenceGraphData = { K: 4, variables: [], degrees: {}, edges: [] }
  allocation: AllocationResult = { K: 4, spillRequired: false, assignment: {}, spillCandidates: [], steps: [] }
  eventStore: EventStore = new EventStore()

  constructor(ir: string, K: number = 4) {
    this.ir = ir
    this.graph.K = K
    this.allocation.K = K
  }

  private emit(
    type: SimulationEvent["type"],
    phase: SimulationEvent["phase"],
    payload: Record<string, unknown>,
    opts: Partial<Pick<SimulationEvent, "instructionId" | "variable" | "explanation">> = {}
  ): void {
    this.eventStore.emit(type, phase, payload, opts)
  }

  parseInstructions(): ParsedInstruction[] {
    this.emit("PhaseStarted", "parsing", { phase: "parsing", label: "Parsing LLVM IR" })
    const lines = this.ir.split("\n")
    const insts: ParsedInstruction[] = []
    let id = 0

    for (const raw of lines) {
      let line = raw.replace(/;.*$/, "").trim()
      if (!line) continue
      if (line.startsWith("define") || line.startsWith("}") || line.includes(":")) continue
      if (line.startsWith("entry:") || line.startsWith("{")) continue

      let result = ""
      let rest = line
      const eqIdx = line.indexOf("=")
      if (eqIdx !== -1) {
        result = line.substring(0, eqIdx).trim()
        rest = line.substring(eqIdx + 1).trim()
      }

      let opcode = rest.split(/\s+/)[0] as Opcode
      if (!["add", "sub", "mul", "load", "store", "phi", "ret"].includes(opcode)) continue

      const operands: string[] = []
      if (opcode === "ret") {
        const retRest = rest.replace("ret", "").trim()
        const parts = retRest.split(/\s+/)
        for (const p of parts) {
          if (p.startsWith("%")) operands.push(p)
        }
      } else {
        const opRest = rest.substring(opcode.length).trim()
        const tokens = opRest.split(/[\s,]+/)
        for (const t of tokens) {
          if (t.startsWith("%")) operands.push(t)
        }
      }

      const inst: ParsedInstruction = { id: id++, result, opcode, operands, text: line.trim() }
      insts.push(inst)

      this.emit("InstructionExecuted", "parsing", {
        instructionId: inst.id,
        opcode: inst.opcode,
        text: inst.text,
      }, { instructionId: inst.id })

      if (result.startsWith("%")) {
        this.emit("VariableDefined", "parsing", {
          variable: result,
          instructionId: inst.id,
          text: inst.text,
        }, {
          instructionId: inst.id,
          variable: result,
          explanation: `Variable ${result} is defined (written) by instruction ${inst.id}: "${inst.text}"`,
        })
      }

      for (const op of operands) {
        this.emit("VariableUsed", "parsing", {
          variable: op,
          instructionId: inst.id,
          text: inst.text,
        }, {
          instructionId: inst.id,
          variable: op,
          explanation: `Variable ${op} is read (used) at instruction ${inst.id}: "${inst.text}"`,
        })
      }
    }

    this.emit("PhaseCompleted", "parsing", { phase: "parsing", instructions: insts.length })
    this.instructions = insts
    return insts
  }

  computeUseDef(inst: ParsedInstruction): { use: string[]; def: string[] } {
    const use: string[] = []
    const def: string[] = []
    for (const op of inst.operands) {
      if (op.startsWith("%") && !use.includes(op)) use.push(op)
    }
    if (inst.result.startsWith("%") && !def.includes(inst.result)) def.push(inst.result)
    return { use, def }
  }

  analyzeLiveness(): {
    sets: LiveSet[]
    iterations: LivenessIteration[]
    liveRanges: Record<string, number[]>
  } {
    this.emit("PhaseStarted", "liveness", { phase: "liveness", label: "Backward Liveness Analysis" })
    const n = this.instructions.length
    let sets: LiveSet[] = this.instructions.map((inst) => {
      const { use, def } = this.computeUseDef(inst)
      return { use, def, liveIn: [], liveOut: [] }
    })

    const iterations: LivenessIteration[] = []
    let changed = true
    let maxIter = 100

    while (changed && maxIter-- > 0) {
      changed = false
      for (let i = n - 1; i >= 0; i--) {
        const newLiveOut: string[] = []
        if (i + 1 < n) {
          for (const v of sets[i + 1].liveIn) {
            if (!newLiveOut.includes(v)) newLiveOut.push(v)
          }
        }
        if (!arraysEqual(newLiveOut, sets[i].liveOut)) {
          sets[i].liveOut = newLiveOut
          changed = true
        }
        const newLiveIn = [...sets[i].use]
        for (const v of sets[i].liveOut) {
          if (!sets[i].def.includes(v) && !newLiveIn.includes(v)) {
            newLiveIn.push(v)
          }
        }
        if (!arraysEqual(newLiveIn, sets[i].liveIn)) {
          sets[i].liveIn = newLiveIn
          changed = true
        }
      }
      iterations.push({ state: JSON.parse(JSON.stringify(sets)), changed })
    }

    // Emit liveness events
    const allVars = new Set<string>()
    for (const s of sets) {
      for (const v of [...s.liveIn, ...s.liveOut, ...s.use, ...s.def]) allVars.add(v)
    }

    const liveRanges: Record<string, number[]> = {}
    for (const v of allVars) {
      const range: number[] = []
      for (let i = 0; i < sets.length; i++) {
        const s = sets[i]
        if (s.liveIn.includes(v) || s.liveOut.includes(v) || s.use.includes(v) || s.def.includes(v)) {
          range.push(i)
        }
      }
      if (range.length > 0) {
        liveRanges[v] = range
        this.emit("VariableBecomesLive", "liveness", {
          variable: v,
          startInstruction: range[0],
          endInstruction: range[range.length - 1],
          range,
        }, {
          variable: v,
          instructionId: range[0],
          explanation: `${v} becomes live at instruction ${range[0]} and remains live until instruction ${range[range.length - 1]}`,
        })
        this.emit("VariableDies", "liveness", {
          variable: v,
          atInstruction: range[range.length - 1],
        }, {
          variable: v,
          instructionId: range[range.length - 1],
          explanation: `${v} dies (last use) at instruction ${range[range.length - 1]}`,
        })
      }
    }

    this.emit("PhaseCompleted", "liveness", { phase: "liveness", variableCount: allVars.size, iterationCount: iterations.length })
    this.liveSets = sets
    this.liveIterations = iterations
    this.liveRanges = liveRanges
    return { sets, iterations, liveRanges }
  }

  buildInterferenceGraph(): InterferenceGraphData {
    this.emit("PhaseStarted", "interference", { phase: "interference", label: "Building Interference Graph" })
    const adjList: Record<string, Set<string>> = {}
    const degree: Record<string, number> = {}
    const edges: { source: string; target: string }[] = []
    const edgeSet = new Set<string>()

    const allVars = new Set<string>()
    for (const s of this.liveSets) {
      for (const v of [...s.liveOut, ...s.def, ...s.use]) allVars.add(v)
    }

    for (const v of allVars) {
      adjList[v] = new Set()
      degree[v] = 0
    }

    for (let i = 0; i < this.liveSets.length; i++) {
      const { liveOut, def } = this.liveSets[i]
      const liveList = Array.from(liveOut)
      for (let j = 0; j < liveList.length; j++) {
        for (let k = j + 1; k < liveList.length; k++) {
          const [u, v] = [liveList[j], liveList[k]].sort()
          const key = `${u}|${v}`
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            edges.push({ source: u, target: v })
            adjList[u].add(v)
            adjList[v].add(u)
            if (degree[u] !== undefined) degree[u]++
            if (degree[v] !== undefined) degree[v]++
            this.emit("InterferenceCreated", "interference", {
              u, v, instructionId: i,
              reason: `${u} and ${v} are simultaneously live at instruction ${i}`,
            }, {
              instructionId: i,
              explanation: `${u} interferes with ${v}: both are live at instruction ${i} ("${this.instructions[i]?.text}")`,
            })
          }
        }
      }

      for (const d of def) {
        for (const lo of liveOut) {
          if (d !== lo) {
            const [u, v] = [d, lo].sort()
            const key = `${u}|${v}`
            if (!edgeSet.has(key)) {
              edgeSet.add(key)
              edges.push({ source: u, target: v })
              if (adjList[d]) adjList[d].add(lo)
              if (adjList[lo]) adjList[lo].add(d)
              if (degree[d] !== undefined) degree[d]++
              if (degree[lo] !== undefined) degree[lo]++
              this.emit("InterferenceCreated", "interference", {
                u: d, v: lo, instructionId: i,
                reason: `${d} defined while ${lo} is live-out at instruction ${i}`,
              }, {
                instructionId: i,
                explanation: `${d} interferes with ${lo}: ${d} is defined while ${lo} is live-out`,
              })
            }
          }
        }
      }
    }

    this.emit("PhaseCompleted", "interference", { phase: "interference", edgeCount: edges.length, nodeCount: allVars.size })
    this.graph = { K: this.graph.K, variables: Array.from(allVars), degrees: degree, edges }
    return this.graph
  }

  allocateRegisters(): AllocationResult {
    this.emit("PhaseStarted", "allocation", { phase: "allocation", label: "Chaitin Graph Coloring", K: this.graph.K })
    const K = this.graph.K
    const adjList: Record<string, string[]> = {}
    for (const v of this.graph.variables) {
      adjList[v] = this.graph.edges
        .filter((e) => e.source === v || e.target === v)
        .map((e) => (e.source === v ? e.target : e.source))
    }

    const tempAdj: Record<string, Set<string>> = {}
    for (const v of this.graph.variables) {
      tempAdj[v] = new Set(adjList[v] || [])
    }

    const stack: string[] = []
    const spillCandidates: string[] = []
    const steps: AllocationStep[] = []

    const recordStep = (
      type: AllocationStep["type"],
      variable: string,
      registerId: number,
      message: string,
      currentAssignment: Record<string, number> = {}
    ) => {
      const rem: Record<string, string[]> = {}
      for (const [k, vs] of Object.entries(tempAdj)) {
        rem[k] = Array.from(vs)
      }
      steps.push({
        type,
        variable,
        registerId,
        message,
        currentAssignment: { ...currentAssignment },
        currentStack: [...stack],
        spillCandidates: [...spillCandidates],
        remainingGraph: rem,
      })
    }

    // Simplify phase
    const vars = Array.from(this.graph.variables)
    let remaining = new Set(vars)
    const getDegree = (v: string) => tempAdj[v]?.size || 0

    while (remaining.size > 0) {
      let found = false
      for (const v of remaining) {
        if (getDegree(v) < K) {
          stack.push(v)
          const msg = `PUSH ${v} (degree ${getDegree(v)} < K=${K})`
          recordStep("SIMPLIFY_PUSH", v, -1, msg)
          this.emit("NodePushed", "allocation", {
            variable: v, degree: getDegree(v), K, stack: [...stack],
          }, {
            variable: v,
            explanation: `${v} has degree ${getDegree(v)} < K=${K}, safe to simplify — pushed onto coloring stack`,
          })
          for (const n of tempAdj[v] || []) { tempAdj[n]?.delete(v) }
          delete tempAdj[v]
          remaining.delete(v)
          found = true
          break
        }
      }

      if (!found) {
        let maxDeg = -1
        let spillVar = ""
        for (const v of remaining) {
          if (getDegree(v) > maxDeg) { maxDeg = getDegree(v); spillVar = v }
        }
        if (spillVar) {
          spillCandidates.push(spillVar)
          stack.push(spillVar)
          const msg = `SPILL CANDIDATE ${spillVar} (degree ${maxDeg} >= K=${K})`
          recordStep("SIMPLIFY_SPILL", spillVar, -1, msg)
          this.emit("SpillInserted", "allocation", {
            variable: spillVar, degree: maxDeg, K, reason: "All remaining nodes have degree ≥ K",
          }, {
            variable: spillVar,
            explanation: `${spillVar} is a potential spill: degree ${maxDeg} ≥ K=${K}. No safe simplification exists — chosen as spill candidate (highest degree heuristic)`,
          })
          for (const n of tempAdj[spillVar] || []) { tempAdj[n]?.delete(spillVar) }
          delete tempAdj[spillVar]
          remaining.delete(spillVar)
        } else { break }
      }
    }

    // Assign colors
    const assignment: Record<string, number> = {}
    const regNames = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]
    const revStack = [...stack].reverse()

    for (const v of revStack) {
      this.emit("NodePopped", "allocation", { variable: v, stack: revStack }, {
        variable: v,
        explanation: `Popping ${v} from stack to assign a color`,
      })
      const usedColors = new Set<number>()
      for (const n of adjList[v] || []) {
        if (assignment[n] !== undefined && assignment[n] >= 0) usedColors.add(assignment[n])
      }
      let color = -1
      for (let c = 0; c < K; c++) {
        if (!usedColors.has(c)) { color = c; break }
      }
      assignment[v] = color
      const regStr = color >= 0 ? regNames[color] || `R${color + 1}` : "SPILL"
      const msg = color >= 0 ? `ASSIGN ${v} → ${regStr}` : `SPILL ${v} (no available register)`

      if (color >= 0) {
        recordStep("ASSIGN", v, color, msg, assignment)
        this.emit("ColorAssigned", "allocation", {
          variable: v, color, register: regStr,
          usedColors: Array.from(usedColors),
          neighbors: adjList[v] || [],
        }, {
          variable: v,
          explanation: `${v} assigned ${regStr}: neighbors use colors [${Array.from(usedColors).map(c => regNames[c]).join(", ")}], so ${regStr} (color ${color}) is the lowest available`,
        })
        this.emit("RegisterAllocated", "allocation", { variable: v, register: regStr, color }, { variable: v })
      } else {
        if (!spillCandidates.includes(v)) spillCandidates.push(v)
        recordStep("ASSIGN", v, -1, msg, assignment)
        this.emit("SpillDetected", "allocation", {
          variable: v, usedColors: Array.from(usedColors), K,
        }, {
          variable: v,
          explanation: `${v} SPILLED: all ${K} registers occupied by interfering neighbors`,
        })
      }
    }

    const spillRequired = spillCandidates.length > 0
    for (const s of spillCandidates) {
      const msg = `SPILL DETECTED: ${s} cannot be assigned a register`
      recordStep("SPILL_DETECTED", s, -1, msg, assignment)
    }

    const namedAssignment: Record<string, { register: number; name: string }> = {}
    for (const [v, r] of Object.entries(assignment)) {
      namedAssignment[v] = { register: r, name: r >= 0 ? regNames[r] || `R${r + 1}` : "SPILL" }
    }

    this.emit("PhaseCompleted", "allocation", {
      phase: "allocation", spillRequired, spillCount: spillCandidates.length,
    })

    this.allocation = { K, spillRequired, assignment: namedAssignment, spillCandidates, steps }
    return this.allocation
  }

  computePressureTimeline(): PressurePoint[] {
    return this.instructions.map((inst, i) => {
      const liveVars = [
        ...this.liveSets[i].liveIn,
        ...this.liveSets[i].liveOut,
      ].filter((v, idx, arr) => arr.indexOf(v) === idx)
      return {
        instructionId: i,
        instructionText: inst.text,
        pressure: liveVars.length,
        liveVariables: liveVars,
        isSpillPoint: this.allocation.spillCandidates.some(s => liveVars.includes(s)),
      }
    })
  }

  computeVariableLifecycles(): Record<string, VariableLifecycle> {
    const lifecycles: Record<string, VariableLifecycle> = {}
    const allVars = this.graph.variables

    for (const v of allVars) {
      const varEvents: VariableEvent[] = []
      const definedAt: number[] = []
      const usedAt: number[] = []

      for (let i = 0; i < this.instructions.length; i++) {
        const inst = this.instructions[i]
        const { use, def } = this.computeUseDef(inst)
        if (def.includes(v)) {
          definedAt.push(i)
          varEvents.push({ eventType: "VariableDefined", instructionId: i, instructionText: inst.text, detail: `${v} defined here` })
        }
        if (use.includes(v)) {
          usedAt.push(i)
          varEvents.push({ eventType: "VariableUsed", instructionId: i, instructionText: inst.text, detail: `${v} used here` })
        }
      }

      const range = this.liveRanges[v] || []
      const interferences = this.graph.edges
        .filter(e => e.source === v || e.target === v)
        .map(e => e.source === v ? e.target : e.source)

      const assignment = this.allocation.assignment[v]
      lifecycles[v] = {
        name: v,
        definedAt,
        usedAt,
        liveRange: range,
        interferences,
        finalRegister: assignment?.register ?? -1,
        finalRegisterName: assignment?.name ?? "SPILL",
        isSpilled: (assignment?.register ?? -1) < 0,
        events: varEvents,
      }
    }
    return lifecycles
  }

  generateMachineCode(): string[] {
    const regNames = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]
    const lines: string[] = []
    const assignment = this.allocation.assignment
    let spillSlot = 0

    for (const inst of this.instructions) {
      const { use, def } = this.computeUseDef(inst)

      // Emit spill loads
      for (const u of use) {
        if (assignment[u]?.name === "SPILL") {
          lines.push(`  ; load spill: ${u}`)
          lines.push(`  mov R_tmp, [mem+${spillSlot++ * 4}]   ; reload ${u} from stack`)
        }
      }

      // Translate instruction
      const toReg = (v: string) => {
        if (!v.startsWith("%")) return v
        const r = assignment[v]
        if (!r) return v
        return r.name === "SPILL" ? `[mem+spill]` : r.name
      }

      let asmLine = ""
      switch (inst.opcode) {
        case "add":
          asmLine = `  add ${toReg(def[0])}, ${toReg(use[0])}, ${toReg(use[1])}`; break
        case "sub":
          asmLine = `  sub ${toReg(def[0])}, ${toReg(use[0])}, ${toReg(use[1])}`; break
        case "mul":
          asmLine = `  mul ${toReg(def[0])}, ${toReg(use[0])}, ${toReg(use[1])}`; break
        case "load":
          asmLine = `  load ${toReg(def[0])}, [${toReg(use[0])}]`; break
        case "store":
          asmLine = `  store [${toReg(use[0])}], ${toReg(use[1])}`; break
        case "ret":
          asmLine = `  ret ${use.length > 0 ? toReg(use[0]) : ""}`; break
        default:
          asmLine = `  ; ${inst.text}`
      }
      lines.push(asmLine)

      // Emit spill stores
      for (const d of def) {
        if (assignment[d]?.name === "SPILL") {
          lines.push(`  mov [mem+${spillSlot++ * 4}], R_tmp   ; spill ${d} to stack`)
        }
      }
    }
    return lines
  }

  runAll(): AnalysisResult {
    this.eventStore.clear()
    this.parseInstructions()
    this.analyzeLiveness()
    this.buildInterferenceGraph()
    this.allocateRegisters()

    const pressureTimeline = this.computePressureTimeline()
    const variableLifecycles = this.computeVariableLifecycles()
    const machineCode = this.generateMachineCode()

    return {
      instructions: this.instructions,
      liveness: {
        iterations: this.liveIterations,
        sets: this.liveSets,
        liveRanges: this.liveRanges,
      },
      interferenceGraph: this.graph,
      allocation: this.allocation,
      events: this.eventStore.getAll(),
      pressureTimeline,
      variableLifecycles,
      machineCode,
    }
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = new Set(a)
  const sb = new Set(b)
  if (sa.size !== sb.size) return false
  for (const v of sa) if (!sb.has(v)) return false
  return true
}
