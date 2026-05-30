"use client"

import { motion } from "framer-motion"
import { AnalysisResult } from "@/types"
import { Terminal, AlertCircle, CheckCircle2 } from "lucide-react"

interface MachineCodeViewProps {
  result: AnalysisResult | null
}

const REG_COLORS: Record<string, string> = {
  R1: "#3B82F6",
  R2: "#22C55E",
  R3: "#F97316",
  R4: "#A855F7",
  R5: "#EC4899",
  R6: "#14B8A6",
  R7: "#EAB308",
  R8: "#06B6D4",
  SPILL: "#EF4444",
}

function highlightAsmLine(line: string, assignment: Record<string, { register: number; name: string }>) {
  const parts: { text: string; type: string }[] = []
  const tokens = line.split(/(\s+|,)/)
  for (const t of tokens) {
    const regMatch = /^(R[1-8]|RAX|RBX|RCX|RDX)$/.test(t)
    const isSpillRef = t.includes("mem") || t.includes("spill")
    const isOpcode = /^(add|sub|mul|mov|load|store|ret|lea|push|pop)$/.test(t)
    const isComment = t.startsWith(";")
    if (regMatch) parts.push({ text: t, type: "register" })
    else if (isSpillRef) parts.push({ text: t, type: "spill" })
    else if (isOpcode) parts.push({ text: t, type: "opcode" })
    else if (isComment) parts.push({ text: t, type: "comment" })
    else parts.push({ text: t, type: "default" })
  }
  return parts
}

export default function MachineCodeView({ result }: MachineCodeViewProps) {
  if (!result) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted">
        Run analysis to generate machine code.
      </div>
    )
  }

  const machineCode = result.machineCode ?? []
  const hasSpills = result.allocation.spillRequired
  const assignment = result.allocation.assignment

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent1" />
          Generated Machine Code
        </h3>
        <div className="flex items-center gap-2">
          {hasSpills ? (
            <div className="flex items-center gap-1 text-[10px] text-red-400">
              <AlertCircle className="w-3 h-3" />
              Contains spill code
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-reg-green">
              <CheckCircle2 className="w-3 h-3" />
              Spill-free
            </div>
          )}
        </div>
      </div>

      {/* Register mapping */}
      <div className="rounded-xl border border-white/5 bg-surface/30 p-3">
        <div className="text-[10px] text-muted mb-2">Virtual → Physical Register Map</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(assignment).map(([v, reg]) => (
            <div key={v} className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-muted">{v}</span>
              <span className="text-white/30">→</span>
              <span
                className="font-bold px-1.5 py-0.5 rounded"
                style={{
                  color: REG_COLORS[reg.name] ?? "#64748B",
                  backgroundColor: `${REG_COLORS[reg.name] ?? "#64748B"}15`,
                }}
              >
                {reg.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Code output */}
      <div className="rounded-xl border border-white/5 bg-[#0A0F1E] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <span className="text-[10px] font-mono text-muted ml-2">output.s</span>
        </div>

        <div className="p-4 font-mono text-[11px] space-y-0.5 overflow-x-auto">
          <div className="text-muted mb-3 text-[10px]">
            ; Auto-generated assembly ({machineCode.length} instructions)
          </div>

          {machineCode.length === 0 ? (
            <div className="text-muted text-center py-4">No code generated.</div>
          ) : (
            machineCode.map((line, i) => {
              const isSpillLine = line.includes("mem+") || line.includes("spill") || line.includes("R_tmp")
              const isComment = line.trim().startsWith(";")
              const parts = highlightAsmLine(line.trim(), assignment)

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.015 }}
                  className={`flex items-baseline gap-3 ${isSpillLine ? "bg-red-500/5 -mx-1 px-1 rounded" : ""}`}
                >
                  <span className="text-white/15 w-6 text-right shrink-0 text-[10px]">{i + 1}</span>
                  <span>
                    {parts.map((p, pi) => {
                      let color = "inherit"
                      if (p.type === "register") color = REG_COLORS[p.text] ?? "#3B82F6"
                      if (p.type === "spill") color = "#EF4444"
                      if (p.type === "opcode") color = "#06B6D4"
                      if (p.type === "comment") color = "#475569"
                      return (
                        <span key={pi} style={{ color }}>
                          {p.text}
                        </span>
                      )
                    })}
                    {isSpillLine && (
                      <span className="ml-2 text-[9px] text-red-400/50">← spill</span>
                    )}
                  </span>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Explanation */}
      <div className="text-[11px] text-muted px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 leading-relaxed">
        <span className="text-white/70 font-semibold">Note: </span>
        This is a simplified pseudo-assembly representation. In a real compiler, the backend would emit target-specific instructions (x86, ARM, RISC-V, etc.) with proper instruction selection, calling conventions, and register encoding.
        {hasSpills && " Spill loads/stores are shown as mov instructions to/from a hypothetical memory operand."}
      </div>
    </div>
  )
}
