"use client"

import { motion } from "framer-motion"
import { AlgorithmComparisonResult } from "@/types"
import { TrendingDown, TrendingUp, Minus, Trophy, Zap, BarChart3 } from "lucide-react"

const MODE_LABELS: Record<string, string> = {
  CHAITIN: "Chaitin Coloring",
  LINEAR_SCAN: "Linear Scan",
  OPTIMISTIC: "Optimistic Coloring",
}

const MODE_COLORS: Record<string, string> = {
  CHAITIN: "#06B6D4",
  LINEAR_SCAN: "#8B5CF6",
  OPTIMISTIC: "#22C55E",
}

const MODE_DESC: Record<string, string> = {
  CHAITIN: "Conservative graph coloring — simplify nodes with degree < K, spill highest-degree nodes",
  LINEAR_SCAN: "Scan live intervals linearly — assign registers greedily, spill longest-interval on overflow",
  OPTIMISTIC: "Briggs optimistic coloring — push all nodes, try to color even potential spills",
}

interface AlgorithmCompareProps {
  results: AlgorithmComparisonResult[]
  K: number
}

function MetricBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] font-mono" style={{ color }}>{value}</span>
    </div>
  )
}

export default function AlgorithmCompare({ results, K }: AlgorithmCompareProps) {
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted">
        Run analysis to compare algorithms.
      </div>
    )
  }

  const maxSpills = Math.max(...results.map(r => r.spillCount), 1)
  const maxSteps = Math.max(...results.map(r => r.stepCount), 1)
  const bestSpillCount = Math.min(...results.map(r => r.spillCount))
  const bestUtilization = Math.max(...results.map(r => r.registerUtilization))

  const metrics = [
    { key: "spillCount", label: "Spill Count", unit: "", lowerBetter: true },
    { key: "stepCount", label: "Algorithm Steps", unit: "", lowerBetter: true },
    { key: "registerUtilization", label: "Register Utilization", unit: "%", lowerBetter: false },
  ]

  const getWinner = (metric: string, lowerBetter: boolean) => {
    const values = results.map(r => ({ mode: r.mode, value: (r as any)[metric] }))
    const best = lowerBetter
      ? values.reduce((a, b) => a.value <= b.value ? a : b)
      : values.reduce((a, b) => a.value >= b.value ? a : b)
    return best.mode
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-accent1" />
        <h3 className="text-sm font-semibold text-white">Algorithm Comparison</h3>
        <span className="text-[10px] text-muted font-mono ml-1">K={K} registers</span>
      </div>

      {/* Algorithm cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {results.map((result, i) => {
          const color = MODE_COLORS[result.mode] ?? "#64748B"
          const isFewest = result.spillCount === bestSpillCount
          const isBestUtil = result.registerUtilization === bestUtilization

          return (
            <motion.div
              key={result.mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-white/5 bg-surface/30 p-4 relative overflow-hidden"
              style={{ boxShadow: `0 0 30px ${color}10` }}
            >
              {/* Color accent top bar */}
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: color }} />

              <div className="mt-1 mb-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">{MODE_LABELS[result.mode]}</h4>
                  {isFewest && result.spillCount === 0 && (
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
                <p className="text-[10px] text-muted mt-1 leading-relaxed">{MODE_DESC[result.mode]}</p>
              </div>

              {/* Key metrics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">Spills</span>
                  <span
                    className="text-base font-bold font-mono"
                    style={{ color: result.spillCount === 0 ? "#22C55E" : result.spillCount === bestSpillCount ? "#EAB308" : "#EF4444" }}
                  >
                    {result.spillCount}
                    {isFewest && result.spillCount > 0 && <span className="text-[9px] ml-1 text-yellow-400">(best)</span>}
                    {result.spillCount === 0 && <span className="text-[9px] ml-1 text-reg-green">✓</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">Steps</span>
                  <span className="text-sm font-mono text-white/80">{result.stepCount}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">Reg. utilization</span>
                  <span className="text-sm font-mono" style={{ color }}>
                    {(result.registerUtilization * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Assignment preview */}
              {Object.keys(result.assignment).length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="text-[10px] text-muted mb-1.5">Assignment</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(result.assignment).map(([v, reg]) => (
                      <span
                        key={v}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: reg.register >= 0
                            ? `${["#3B82F6","#22C55E","#F97316","#A855F7"][reg.register] ?? "#475569"}20`
                            : "#EF444415",
                          color: reg.register >= 0
                            ? (["#3B82F6","#22C55E","#F97316","#A855F7"][reg.register] ?? "#64748B")
                            : "#EF4444",
                        }}
                      >
                        {v}→{reg.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Comparison table */}
      <div className="rounded-xl border border-white/5 bg-surface/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h4 className="text-xs font-semibold text-white">Metric Comparison</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-2 text-muted font-normal">Metric</th>
                {results.map(r => (
                  <th key={r.mode} className="text-left px-4 py-2 font-semibold" style={{ color: MODE_COLORS[r.mode] }}>
                    {MODE_LABELS[r.mode]}
                  </th>
                ))}
                <th className="text-left px-4 py-2 text-muted font-normal">Winner</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(({ key, label, unit, lowerBetter }) => {
                const winner = getWinner(key, lowerBetter)
                return (
                  <tr key={key} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2 text-muted">{label}</td>
                    {results.map(r => {
                      const val = (r as any)[key]
                      const isWinner = r.mode === winner
                      const displayVal = key === "registerUtilization"
                        ? `${(val * 100).toFixed(0)}${unit}`
                        : `${val}${unit}`
                      return (
                        <td key={r.mode} className="px-4 py-2">
                          <span className={`font-mono font-semibold ${isWinner ? "" : "text-muted"}`}
                            style={{ color: isWinner ? MODE_COLORS[r.mode] : undefined }}>
                            {displayVal}
                            {isWinner && <span className="ml-1 text-[9px]">★</span>}
                          </span>
                        </td>
                      )
                    })}
                    <td className="px-4 py-2">
                      <span className="text-[10px] font-mono" style={{ color: MODE_COLORS[winner] }}>
                        {MODE_LABELS[winner]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary insight */}
      <div className="px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] text-[11px] text-muted leading-relaxed">
        <span className="text-white font-semibold">Insight: </span>
        {results.every(r => r.spillCount === 0)
          ? `All three algorithms produced spill-free allocation for K=${K} registers. The interference graph is K-colorable.`
          : `With K=${K} registers: ${results.map(r => `${MODE_LABELS[r.mode]} → ${r.spillCount} spill${r.spillCount !== 1 ? "s" : ""}`).join(", ")}. ${
              results.find(r => r.spillCount === bestSpillCount)
                ? `${MODE_LABELS[results.find(r => r.spillCount === bestSpillCount)!.mode]} performs best for this program.`
                : ""
            }`
        }
      </div>
    </div>
  )
}
