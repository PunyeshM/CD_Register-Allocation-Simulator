export type Opcode = "add" | "sub" | "mul" | "load" | "store" | "phi" | "ret"

export interface ParsedInstruction {
  id: number
  result: string
  opcode: Opcode
  operands: string[]
  text: string
}

export interface LiveSet {
  use: string[]
  def: string[]
  liveIn: string[]
  liveOut: string[]
}

export interface LivenessIteration {
  state: LiveSet[]
  changed: boolean
}

export interface LiveRange {
  variable: string
  range: number[]
}

export interface InterferenceGraphData {
  K: number
  variables: string[]
  degrees: Record<string, number>
  edges: { source: string; target: string }[]
}

export interface AllocationStep {
  type: "SIMPLIFY_PUSH" | "SIMPLIFY_SPILL" | "ASSIGN" | "SPILL_DETECTED"
  variable: string
  registerId: number
  message: string
  currentAssignment: Record<string, number>
  currentStack: string[]
  spillCandidates: string[]
  remainingGraph: Record<string, string[]>
}

export interface AllocationResult {
  K: number
  spillRequired: boolean
  assignment: Record<string, { register: number; name: string }>
  spillCandidates: string[]
  steps: AllocationStep[]
}

export interface AnalysisResult {
  instructions: ParsedInstruction[]
  liveness: {
    iterations: LivenessIteration[]
    sets: LiveSet[]
    liveRanges: Record<string, number[]>
  }
  interferenceGraph: InterferenceGraphData
  allocation: AllocationResult
}
