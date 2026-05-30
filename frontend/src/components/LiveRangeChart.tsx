"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ParsedInstruction, LiveSet, VariableLifecycle } from "@/types"
import { Info } from "lucide-react"

const REG_COLORS: Record<number, string> = {
  0: "#3B82F6",
  1: "#22C55E",
  2: "#F97316",
  3: "#A855F7",
  4: "#EC4899",
  5: "#14B8A6",
  6: "#EAB308",
  7: "#06B6D4",
}

interface LiveRangeChartProps {
  instructions: ParsedInstruction[]
  liveSets: LiveSet[]
  liveRanges: Record<string, number[]>
  assignment: Record<string, { register: number; name: string }>
  spillCandidates: string[]
  selectedVariable?: string | null
  onSelectVariable?: (v: string | null) => void
}

export default function LiveRangeChart({
  instructions,
  liveSets,
  liveRanges,
  assignment,
  spillCandidates,
  selectedVariable,
  onSelectVariable,
}: LiveRangeChartProps) {
  const [hoveredVar, setHoveredVar] = useState<string | null>(null)
  const [hoveredInst, setHoveredInst] = useState<number | null>(null)

  const variables = useMemo(() => Object.keys(liveRanges).sort(), [liveRanges])

  const maxInst = instructions.length

  const getColor = (v: string) => {
    const reg = assignment[v]?.register ?? -1
    if (spillCandidates.includes(v)) return "#EF4444"
    return REG_COLORS[reg] ?? "#64748B"
  }

  const isLive = (v: string, i: number) => liveRanges[v]?.includes(i) ?? false
  const isDef = (v: string, i: number) => liveSets[i]?.def.includes(v) ?? false
  const isUse = (v: string, i: number) => liveSets[i]?.use.includes(v) ?? false

  if (variables.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted">
        No variables found. Run analysis first.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Live Range Timeline</h3>
        <div className="flex items-center gap-3 text-[10px] text-muted">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Live</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white inline-block" /> Def</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Use</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Spill</span>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-surface/30 overflow-hidden">
        {/* Header — instruction numbers */}
        <div className="flex border-b border-white/5">
          <div className="w-20 shrink-0 px-3 py-2 text-[10px] text-muted font-mono border-r border-white/5">Var</div>
          <div className="flex-1 overflow-x-auto scrollbar-none">
            <div className="flex min-w-max">
              {instructions.map((inst, i) => (
                <div
                  key={i}
                  className={`w-10 shrink-0 px-1 py-2 text-center text-[9px] font-mono transition-colors cursor-pointer ${
                    hoveredInst === i ? "bg-white/5 text-white" : "text-muted"
                  }`}
                  onMouseEnter={() => setHoveredInst(i)}
                  onMouseLeave={() => setHoveredInst(null)}
                  title={inst.text}
                >
                  I{i}
                </div>
              ))}
            </div>
          </div>
          <div className="w-16 shrink-0 px-2 py-2 text-[10px] text-muted font-mono border-l border-white/5 text-right">Reg</div>
        </div>

        {/* Variable rows */}
        {variables.map((v, rowIdx) => {
          const color = getColor(v)
          const isSpilled = spillCandidates.includes(v)
          const reg = assignment[v]
          const isSelected = selectedVariable === v
          const isHovered = hoveredVar === v

          return (
            <motion.div
              key={v}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rowIdx * 0.03 }}
              className={`flex border-b border-white/[0.03] cursor-pointer transition-colors ${
                isSelected ? "bg-white/[0.05]" : isHovered ? "bg-white/[0.02]" : ""
              }`}
              onMouseEnter={() => setHoveredVar(v)}
              onMouseLeave={() => setHoveredVar(null)}
              onClick={() => onSelectVariable?.(isSelected ? null : v)}
            >
              {/* Variable name */}
              <div
                className="w-20 shrink-0 px-3 py-1.5 border-r border-white/5 flex items-center"
                title={v}
              >
                <span
                  className="text-[11px] font-mono truncate"
                  style={{ color: isSelected || isHovered ? color : "#94A3B8" }}
                >
                  {v}
                </span>
              </div>

              {/* Live range cells */}
              <div className="flex-1 overflow-x-auto scrollbar-none">
                <div className="flex min-w-max">
                  {instructions.map((inst, i) => {
                    const live = isLive(v, i)
                    const def = isDef(v, i)
                    const use = isUse(v, i)
                    const instHovered = hoveredInst === i

                    return (
                      <div
                        key={i}
                        className={`w-10 shrink-0 h-7 flex items-center justify-center relative transition-all ${
                          instHovered ? "ring-inset ring-1 ring-white/10" : ""
                        }`}
                      >
                        {live && (
                          <div
                            className="absolute inset-0.5 rounded-sm transition-opacity"
                            style={{
                              backgroundColor: `${color}${isSelected || isHovered ? "55" : "30"}`,
                              border: `1px solid ${color}${isSelected || isHovered ? "80" : "40"}`,
                            }}
                          />
                        )}
                        {def && (
                          <div
                            className="w-2 h-2 rounded-full z-10"
                            style={{
                              backgroundColor: "white",
                              outline: `2px solid ${color}`,
                              outlineOffset: "1px",
                            }}
                            title={`${v} defined at I${i}`}
                          />
                        )}
                        {use && !def && (
                          <div
                            className="w-1.5 h-1.5 rounded-full z-10"
                            style={{ backgroundColor: "#EAB308" }}
                            title={`${v} used at I${i}`}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Register assignment */}
              <div className="w-16 shrink-0 px-2 py-1.5 border-l border-white/5 flex items-center justify-end">
                {reg ? (
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: isSpilled ? "#EF4444" : color,
                      backgroundColor: isSpilled ? "#EF444415" : `${color}15`,
                    }}
                  >
                    {reg.name}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted font-mono">—</span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Instruction detail on hover */}
      <AnimatePresence>
        {hoveredInst !== null && instructions[hoveredInst] && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-start gap-2 px-3 py-2 rounded-lg border border-white/5 bg-surface/60 text-[11px] font-mono"
          >
            <Info className="w-3.5 h-3.5 text-accent1 mt-0.5 shrink-0" />
            <div>
              <span className="text-muted">I{hoveredInst}:</span>
              <span className="text-white ml-2">{instructions[hoveredInst].text}</span>
              <div className="text-muted mt-0.5">
                Live at this point: [{liveSets[hoveredInst]?.liveOut.join(", ") || "—"}]
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
