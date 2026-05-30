// ============================================================
// Register Allocation Simulator 2.0 — Complete Type System
// ============================================================

// -----------------------------------------------------------
// Core IR & Parsing
// -----------------------------------------------------------
export type Opcode = "add" | "sub" | "mul" | "load" | "store" | "phi" | "ret" | "br" | "icmp" | "alloca"

export interface ParsedInstruction {
  id: number
  result: string
  opcode: Opcode
  operands: string[]
  text: string
  blockId?: string
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
  start: number
  end: number
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
  events?: SimulationEvent[]
  cfg?: CFGGraph
  pressureTimeline?: PressurePoint[]
  variableLifecycles?: Record<string, VariableLifecycle>
  machineCode?: string[]
}

// -----------------------------------------------------------
// Event-Driven Simulation Engine
// -----------------------------------------------------------
export type EventType =
  | "InstructionExecuted"
  | "VariableDefined"
  | "VariableUsed"
  | "VariableBecomesLive"
  | "VariableDies"
  | "InterferenceCreated"
  | "NodeSimplified"
  | "NodePushed"
  | "NodePopped"
  | "ColorAssigned"
  | "SpillDetected"
  | "SpillInserted"
  | "RegisterAllocated"
  | "PhaseStarted"
  | "PhaseCompleted"

export interface SimulationEvent {
  id: string
  type: EventType
  timestamp: number
  phase: "parsing" | "liveness" | "interference" | "allocation" | "complete"
  instructionId?: number
  variable?: string
  payload: Record<string, unknown>
  explanation?: string
}

// -----------------------------------------------------------
// CFG Types
// -----------------------------------------------------------
export interface CFGBlock {
  id: string
  label: string
  instructions: ParsedInstruction[]
  successors: string[]
  predecessors: string[]
  isEntry: boolean
  isExit: boolean
  isLoopHeader?: boolean
  dominators?: string[]
}

export interface CFGEdge {
  source: string
  target: string
  isBackEdge: boolean
  label?: string
}

export interface CFGGraph {
  blocks: CFGBlock[]
  edges: CFGEdge[]
  entry: string
  exits: string[]
}

// -----------------------------------------------------------
// Algorithm Modes
// -----------------------------------------------------------
export type AlgorithmMode = "CHAITIN" | "LINEAR_SCAN" | "OPTIMISTIC"

export interface AlgorithmComparisonResult {
  mode: AlgorithmMode
  label: string
  spillCount: number
  stepCount: number
  registerUtilization: number
  assignment: Record<string, { register: number; name: string }>
  spillCandidates: string[]
  steps: AllocationStep[]
}

// -----------------------------------------------------------
// Register File State
// -----------------------------------------------------------
export interface RegisterSlot {
  id: number
  name: string          // "R1", "RAX", etc.
  occupant: string | null
  color: number         // register color index
  isSpill: boolean
  animating: boolean
}

export interface RegisterFileState {
  slots: RegisterSlot[]
  eventIndex: number
}

// -----------------------------------------------------------
// Register Pressure
// -----------------------------------------------------------
export interface PressurePoint {
  instructionId: number
  instructionText: string
  pressure: number
  liveVariables: string[]
  isSpillPoint: boolean
}

// -----------------------------------------------------------
// Variable Lifecycle (Memory System)
// -----------------------------------------------------------
export interface VariableEvent {
  eventType: EventType
  instructionId: number
  instructionText: string
  detail: string
}

export interface VariableLifecycle {
  name: string
  definedAt: number[]
  usedAt: number[]
  liveRange: number[]
  interferences: string[]
  finalRegister: number
  finalRegisterName: string
  isSpilled: boolean
  events: VariableEvent[]
}

// -----------------------------------------------------------
// AI Agent Types
// -----------------------------------------------------------
export type AgentType = "liveness" | "coloring" | "spill" | "graph" | "tutor"

export interface AgentExplanation {
  agent: AgentType
  subject: string
  title: string
  text: string
  detail?: string
  tips?: string[]
  relatedVariables?: string[]
  confidence: "high" | "medium" | "low"
}

export interface TutorQA {
  question: string
  answer: string
  agent: AgentType
  relatedConcepts: string[]
}

// -----------------------------------------------------------
// Walkthrough Mode
// -----------------------------------------------------------
export interface WalkthroughStep {
  id: number
  title: string
  description: string
  targetTab: string
  targetElement?: string
  agentExplanation?: AgentExplanation
  eventIndex?: number
}

// -----------------------------------------------------------
// Machine Code Output
// -----------------------------------------------------------
export interface MachineInstruction {
  id: number
  original: string
  assembly: string
  registers: string[]
  isSpillLoad?: boolean
  isSpillStore?: boolean
}

// -----------------------------------------------------------
// Linear Scan Interval
// -----------------------------------------------------------
export interface LiveInterval {
  variable: string
  start: number
  end: number
  register: number   // -1 = spilled
  registerName: string
}
