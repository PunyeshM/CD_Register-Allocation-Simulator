// ============================================================
// TutorAgent.ts — Educational Q&A agent with contextual answers
// ============================================================
import { AnalysisResult, AgentExplanation, TutorQA } from "@/types"

interface QARule {
  keywords: string[]
  agent: AgentExplanation["agent"]
  title: string
  answer: (ctx: AnalysisResult | null) => string
  detail?: (ctx: AnalysisResult | null) => string
  concepts: string[]
}

const QA_RULES: QARule[] = [
  {
    keywords: ["liveness", "live", "live analysis", "what is liveness"],
    agent: "liveness",
    title: "What is Liveness Analysis?",
    answer: (ctx) => {
      const varCount = ctx?.interferenceGraph.variables.length ?? 0
      const plurality = varCount !== 1 ? "s were" : " was"
      return `Liveness analysis determines, for each point in the program, which variables are "live" — meaning their current value might be needed in the future. A variable is live at point P if there exists a path from P to a use of that variable that does not pass through a redefinition of it.${ctx ? ` In your program, ${varCount} variable${plurality} analyzed.` : ""}`
    },
    detail: () => "We compute four sets per instruction: USE (variables read before being defined), DEF (variables defined), LIVE_IN (live at entry of instruction), LIVE_OUT (live at exit). The dataflow equations: LIVE_IN = USE ∪ (LIVE_OUT − DEF) and LIVE_OUT = ∪ LIVE_IN of successors.",
    concepts: ["backward dataflow", "USE", "DEF", "LIVE_IN", "LIVE_OUT"],
  },
  {
    keywords: ["graph coloring", "coloring", "chaitin", "k-coloring"],
    agent: "coloring",
    title: "What is Graph Coloring Register Allocation?",
    answer: (ctx) => {
      const K = ctx?.allocation.K ?? 4
      const spilled = ctx?.allocation.spillRequired
      return `Graph coloring register allocation models register assignment as a graph coloring problem. Each variable becomes a node, each interference becomes an edge, and each physical register is a color. The goal is to color all nodes with at most K=${K} colors such that no two adjacent (interfering) nodes share a color.${ctx ? ` In your program, the allocation ${spilled ? "required spills" : "succeeded with no spills"}.` : ""}`
    },
    detail: () => "Chaitin's algorithm: (1) Simplify — repeatedly remove nodes with degree < K and push to stack. (2) Spill — if stuck, pick a spill candidate. (3) Assign — pop stack and assign lowest available color to each node.",
    concepts: ["interference graph", "K-coloring", "NP-completeness", "Chaitin", "simplify", "assign"],
  },
  {
    keywords: ["interference", "interfere", "interference graph"],
    agent: "graph",
    title: "What is an Interference Graph?",
    answer: (ctx) => {
      const edges = ctx?.interferenceGraph.edges.length ?? 0
      const vars = ctx?.interferenceGraph.variables.length ?? 0
      return `An interference graph is an undirected graph where each node represents a variable (virtual register), and an edge exists between two variables if their live ranges overlap. If two variables are simultaneously live at any program point, they interfere — they cannot occupy the same physical register.${ctx ? ` Your program has ${vars} variables and ${edges} interference edges.` : ""}`
    },
    detail: () => "Building the graph: for each instruction, any two variables in the LIVE_OUT set interfere. Additionally, a defined variable interferes with all variables in LIVE_OUT.",
    concepts: ["undirected graph", "live range overlap", "simultaneous liveness"],
  },
  {
    keywords: ["spill", "spilling", "why spill", "memory", "stack"],
    agent: "spill",
    title: "What is Register Spilling?",
    answer: (ctx) => {
      const spillCount = ctx?.allocation.spillCandidates.length ?? 0
      const K = ctx?.allocation.K ?? 4
      return `Register spilling occurs when a variable cannot be assigned a physical register because all K=${K} registers are occupied by interfering live variables. The compiler inserts "spill code" — a store to memory before each definition and a load from memory before each use. This keeps the variable's value in memory when it's not in a register.${ctx && spillCount > 0 ? ` In your program, ${spillCount} variable${spillCount > 1 ? "s were" : " was"} spilled.` : ctx ? " In your program, no spills occurred!" : ""}`
    },
    detail: () => "Spill cost = number of loads + stores inserted × frequency of execution. Good spill heuristics pick variables with: low use frequency, long live ranges not in loops, or high degree.",
    concepts: ["memory access", "load/store", "spill code", "spill cost"],
  },
  {
    keywords: ["register pressure", "pressure", "hotspot"],
    agent: "spill",
    title: "What is Register Pressure?",
    answer: (ctx) => {
      const K = ctx?.allocation.K ?? 4
      const maxPressure = ctx?.pressureTimeline
        ? Math.max(...ctx.pressureTimeline.map(p => p.pressure))
        : null
      return `Register pressure at a program point is the number of variables simultaneously live at that point. When pressure exceeds K=${K} (the number of physical registers), at least one variable must be spilled to memory.${maxPressure !== null ? ` Peak pressure in your program is ${maxPressure} vs K=${K} — ${maxPressure > K ? "spills are needed" : "within safe range"}.` : ""}`
    },
    concepts: ["simultaneous live variables", "K threshold", "spill trigger"],
  },
  {
    keywords: ["live range", "lifetime", "interval"],
    agent: "liveness",
    title: "What is a Live Range?",
    answer: () => "A variable's live range is the set of program points where it holds a value that might be used in the future. It spans from the variable's definition to its last use. If a variable is redefined before it's used again, its live range ends at the redefinition. Live ranges are the fundamental unit for register allocation — two variables with non-overlapping live ranges can share a register.",
    concepts: ["definition point", "last use", "range splitting"],
  },
  {
    keywords: ["simplify", "simplification", "push", "stack"],
    agent: "coloring",
    title: "What is the Simplification Phase?",
    answer: (ctx) => {
      const steps = ctx?.allocation.steps.filter(s => s.type === "SIMPLIFY_PUSH").length ?? 0
      return `Simplification is the first phase of Chaitin's algorithm. Nodes with degree < K are "safe" — they can always be colored regardless of how their neighbors are colored. We repeatedly remove such nodes from the graph and push them onto a stack.${ctx ? ` In your program, ${steps} nodes were simplified.` : ""}`
    },
    detail: () => "The key insight: if degree(v) < K, then even if all K−1 neighbors use K−1 different colors, there's still at least one color left for v. So removing v doesn't affect the colorability of the remaining graph.",
    concepts: ["degree < K", "safe removal", "coloring stack"],
  },
  {
    keywords: ["llvm", "llvm ir", "intermediate representation", "ir"],
    agent: "liveness",
    title: "What is LLVM IR?",
    answer: () => "LLVM IR (Intermediate Representation) is a typed, SSA-form, low-level programming language used by the LLVM compiler infrastructure. It sits between source code and machine code. Variables in LLVM IR are in SSA (Static Single Assignment) form — each variable is defined exactly once. This simplifies analysis. Register allocation converts virtual SSA variables to physical machine registers.",
    concepts: ["SSA form", "virtual registers", "compiler backend"],
  },
  {
    keywords: ["linear scan", "linear"],
    agent: "coloring",
    title: "What is Linear Scan Allocation?",
    answer: () => "Linear Scan Register Allocation is a faster alternative to graph coloring. It works by: (1) Computing live intervals for each variable (start point to end point), (2) Sorting intervals by start point, (3) Scanning linearly through intervals, assigning the first free register. When no register is free, the variable with the longest remaining interval is spilled. Linear scan is O(n log n) vs O(n²) for graph coloring, making it popular in JIT compilers (Java HotSpot, V8).",
    concepts: ["live intervals", "linear time", "JIT compilers"],
  },
  {
    keywords: ["optimistic", "briggs", "optimistic coloring"],
    agent: "coloring",
    title: "What is Optimistic Coloring?",
    answer: () => "Optimistic Coloring (Briggs, 1994) is a refinement of Chaitin's algorithm. Instead of immediately confirming a spill when all nodes have degree ≥ K, it pushes the node onto the stack anyway and attempts to color it during the assignment phase. If the node's neighbors end up using fewer than K distinct colors (due to their own constraints), the optimistic node can still be colored — avoiding the spill. This often reduces spill count compared to conservative Chaitin.",
    concepts: ["optimistic spill", "Briggs", "fewer spills"],
  },
]

export class TutorAgent {
  private context: AnalysisResult | null

  constructor(context: AnalysisResult | null = null) {
    this.context = context
  }

  updateContext(ctx: AnalysisResult): void {
    this.context = ctx
  }

  answer(question: string): TutorQA {
    const q = question.toLowerCase().trim()

    // Find best matching rule
    let bestRule: QARule | null = null
    let bestScore = 0

    for (const rule of QA_RULES) {
      let score = 0
      for (const kw of rule.keywords) {
        if (q.includes(kw)) score += kw.length
      }
      if (score > bestScore) { bestScore = score; bestRule = rule }
    }

    if (bestRule && bestScore > 0) {
      const answerText = bestRule.answer(this.context)
      const detailText = bestRule.detail?.(this.context)
      return {
        question,
        answer: answerText + (detailText ? `\n\n**Details:** ${detailText}` : ""),
        agent: bestRule.agent,
        relatedConcepts: bestRule.concepts,
      }
    }

    // Fallback: contextual generic answer
    return this.genericAnswer(question)
  }

  getSuggestions(): string[] {
    const base = [
      "What is liveness analysis?",
      "Why is graph coloring used for register allocation?",
      "What is an interference graph?",
      "Why did a spill occur?",
      "What is register pressure?",
      "How does linear scan differ from graph coloring?",
      "What is optimistic coloring?",
      "What is LLVM IR?",
    ]

    if (this.context?.allocation.spillRequired) {
      base.unshift("Why were there spills in my program?")
    }
    if (this.context && !this.context.allocation.spillRequired) {
      base.unshift("Why was my program allocated without spills?")
    }

    return base.slice(0, 6)
  }

  private genericAnswer(question: string): TutorQA {
    return {
      question,
      answer: `I don't have a specific answer for "${question}". Try asking about:\n\n• Liveness analysis\n• Graph coloring\n• Register spilling\n• Interference graphs\n• Register pressure\n• Linear scan allocation\n• Optimistic coloring\n• LLVM IR`,
      agent: "tutor",
      relatedConcepts: ["register allocation", "compiler backend"],
    }
  }
}
