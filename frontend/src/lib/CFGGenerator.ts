// ============================================================
// CFGGenerator.ts — Control Flow Graph from LLVM IR
// ============================================================
import { CFGBlock, CFGEdge, CFGGraph, ParsedInstruction, Opcode } from "@/types"

interface RawBlock {
  id: string
  label: string
  lines: string[]
  instructions: ParsedInstruction[]
  successorLabels: string[]
}

export class CFGGenerator {
  private ir: string

  constructor(ir: string) {
    this.ir = ir
  }

  generate(): CFGGraph {
    const rawBlocks = this.parseBlocks()
    if (rawBlocks.length === 0) {
      // Single basic block (no labels) — trivial CFG
      return this.buildTrivialCFG()
    }
    return this.buildCFG(rawBlocks)
  }

  private parseBlocks(): RawBlock[] {
    const lines = this.ir.split("\n")
    const blocks: RawBlock[] = []
    let currentBlock: RawBlock | null = null
    let instId = 0

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || line.startsWith(";")) continue
      if (line.startsWith("define") || line === "{" || line === "}") continue

      // Block label: ends with ":"
      const labelMatch = line.match(/^(\w+):/)
      if (labelMatch) {
        if (currentBlock) blocks.push(currentBlock)
        currentBlock = {
          id: labelMatch[1],
          label: labelMatch[1],
          lines: [],
          instructions: [],
          successorLabels: [],
        }
        continue
      }

      if (!currentBlock) {
        // Before any label — treat as "entry" block
        currentBlock = {
          id: "entry",
          label: "entry",
          lines: [],
          instructions: [],
          successorLabels: [],
        }
      }

      currentBlock.lines.push(line)

      // Parse instructions for this block
      const parsed = this.parseLine(line, instId, currentBlock.id)
      if (parsed) {
        currentBlock.instructions.push(parsed)
        instId++
      }

      // Detect branch terminators
      if (line.startsWith("br ")) {
        const targets = this.extractBranchTargets(line)
        currentBlock.successorLabels.push(...targets)
      } else if (line.startsWith("ret ") || line === "ret void") {
        // no successors
      }
    }

    if (currentBlock) blocks.push(currentBlock)
    return blocks
  }

  private parseLine(line: string, id: number, blockId: string): ParsedInstruction | null {
    const cleaned = line.replace(/;.*$/, "").trim()
    if (!cleaned) return null

    let result = ""
    let rest = cleaned
    const eqIdx = cleaned.indexOf("=")
    if (eqIdx !== -1) {
      result = cleaned.substring(0, eqIdx).trim()
      rest = cleaned.substring(eqIdx + 1).trim()
    }

    const opcode = rest.split(/\s+/)[0] as Opcode
    const validOpcodes: Opcode[] = ["add", "sub", "mul", "load", "store", "phi", "ret", "br", "icmp", "alloca"]
    if (!validOpcodes.includes(opcode)) return null

    const operands: string[] = []
    const tokens = rest.substring(opcode.length).split(/[\s,]+/)
    for (const t of tokens) {
      if (t.startsWith("%")) operands.push(t)
    }

    return { id, result, opcode, operands, text: line.trim(), blockId }
  }

  private extractBranchTargets(line: string): string[] {
    // br i1 %cond, label %true, label %false
    // br label %target
    const targets: string[] = []
    const labelMatches = line.matchAll(/label %(\w+)/g)
    for (const m of labelMatches) {
      targets.push(m[1])
    }
    return targets
  }

  private buildTrivialCFG(): CFGGraph {
    // Parse all instructions as a single entry block
    const lines = this.ir.split("\n")
    const instructions: ParsedInstruction[] = []
    let id = 0
    for (const raw of lines) {
      const line = raw.replace(/;.*$/, "").trim()
      if (!line) continue
      if (line.startsWith("define") || line.startsWith("}") || line.includes(":") && !line.startsWith("%")) continue
      const parsed = this.parseLine(line, id, "entry")
      if (parsed) { instructions.push(parsed); id++ }
    }

    const entryBlock: CFGBlock = {
      id: "entry",
      label: "entry (single block)",
      instructions,
      successors: [],
      predecessors: [],
      isEntry: true,
      isExit: true,
    }

    return {
      blocks: [entryBlock],
      edges: [],
      entry: "entry",
      exits: ["entry"],
    }
  }

  private buildCFG(rawBlocks: RawBlock[]): CFGGraph {
    const blockMap = new Map(rawBlocks.map(b => [b.id, b]))
    const edges: CFGEdge[] = []

    // Build edges
    for (const block of rawBlocks) {
      for (const succ of block.successorLabels) {
        if (blockMap.has(succ)) {
          edges.push({ source: block.id, target: succ, isBackEdge: false })
        }
      }
    }

    // Detect back edges (simple: if target appears before source in block order)
    const blockOrder = rawBlocks.map(b => b.id)
    for (const edge of edges) {
      const srcIdx = blockOrder.indexOf(edge.source)
      const tgtIdx = blockOrder.indexOf(edge.target)
      if (tgtIdx <= srcIdx) {
        edge.isBackEdge = true
        edge.label = "loop back"
      }
    }

    // Build predecessor map
    const predMap = new Map<string, string[]>()
    for (const b of rawBlocks) predMap.set(b.id, [])
    for (const edge of edges) {
      predMap.get(edge.target)?.push(edge.source)
    }

    // Detect loop headers (targets of back edges)
    const loopHeaders = new Set(edges.filter(e => e.isBackEdge).map(e => e.target))

    // Build CFGBlocks
    const cfgBlocks: CFGBlock[] = rawBlocks.map((raw, idx) => ({
      id: raw.id,
      label: raw.label,
      instructions: raw.instructions,
      successors: raw.successorLabels.filter(s => blockMap.has(s)),
      predecessors: predMap.get(raw.id) || [],
      isEntry: idx === 0,
      isExit: raw.successorLabels.length === 0,
      isLoopHeader: loopHeaders.has(raw.id),
    }))

    const exits = cfgBlocks.filter(b => b.isExit).map(b => b.id)

    return {
      blocks: cfgBlocks,
      edges,
      entry: rawBlocks[0]?.id || "entry",
      exits,
    }
  }
}
