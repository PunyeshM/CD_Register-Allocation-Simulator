"use client"

import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PressurePoint } from "@/types"
import { AlertTriangle, TrendingUp, CheckCircle } from "lucide-react"

interface PressureChartProps {
  pressureTimeline: PressurePoint[]
  K: number
  onSelectInstruction?: (id: number) => void
  highlightedInstruction?: number | null
}

export default function PressureChart({
  pressureTimeline,
  K,
  onSelectInstruction,
  highlightedInstruction,
}: PressureChartProps) {
  const maxPressure = Math.max(...pressureTimeline.map(p => p.pressure), K)
  const peakPoint = pressureTimeline.reduce<PressurePoint | null>(
    (max, p) => (!max || p.pressure > max.pressure ? p : max), null
  )
  const avgPressure = pressureTimeline.length > 0
    ? (pressureTimeline.reduce((s, p) => s + p.pressure, 0) / pressureTimeline.length).toFixed(1)
    : "0"
  const spillPoints = pressureTimeline.filter(p => p.isSpillPoint)
  const overPressureCount = pressureTimeline.filter(p => p.pressure > K).length
  const height = 120
  const width = pressureTimeline.length

  const points = useMemo(() => {
    return pressureTimeline.map((p, i) => ({
      x: width > 1 ? (i / (width - 1)) * 100 : 50,
      y: maxPressure > 0 ? ((maxPressure - p.pressure) / maxPressure) * 100 : 50,
      point: p,
    }))
  }, [pressureTimeline, maxPressure, width])

  const thresholdY = maxPressure > 0 ? ((maxPressure - K) / maxPressure) * 100 : 50

  const pathD = points.length > 1
    ? `M ${points[0].x} ${points[0].y} ` +
      points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
    : ""

  const areaD = points.length > 1
    ? `M ${points[0].x} 100 L ${points[0].x} ${points[0].y} ` +
      points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ") +
      ` L ${points[points.length - 1].x} 100 Z`
    : ""

  if (pressureTimeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted">
        No pressure data. Run analysis first.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
          <div className="text-xl font-bold font-mono text-accent1">{peakPoint?.pressure ?? 0}</div>
          <div className="text-[10px] text-muted">Peak Pressure</div>
          {(peakPoint?.pressure ?? 0) > K && (
            <div className="text-[9px] text-red-400 mt-0.5">Exceeds K={K}</div>
          )}
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
          <div className="text-xl font-bold font-mono text-accent2">{avgPressure}</div>
          <div className="text-[10px] text-muted">Avg Pressure</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
          <div className={`text-xl font-bold font-mono ${overPressureCount > 0 ? "text-red-400" : "text-reg-green"}`}>
            {overPressureCount}
          </div>
          <div className="text-[10px] text-muted">Overflow Points</div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="rounded-xl border border-white/5 bg-surface/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-white">Register Pressure Over Time</h4>
          <div className="flex items-center gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <div className="w-6 h-px border-t border-dashed border-accent1" />
              K={K} limit
            </span>
            {spillPoints.length > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                Spill trigger
              </span>
            )}
          </div>
        </div>

        <svg
          viewBox={`0 0 100 ${height}`}
          className="w-full"
          style={{ height: height }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={overPressureCount > 0 ? "#EF4444" : "#06B6D4"} stopOpacity="0.4" />
              <stop offset="100%" stopColor={overPressureCount > 0 ? "#EF4444" : "#06B6D4"} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor={overPressureCount > 0 ? "#EF4444" : "#8B5CF6"} />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill="url(#pressureGrad)" />

          {/* Threshold line */}
          <line
            x1="0" y1={thresholdY}
            x2="100" y2={thresholdY}
            stroke="#06B6D4" strokeWidth="0.5" strokeDasharray="2,2"
            opacity="0.7"
          />
          <text x="1" y={thresholdY - 1} fontSize="3.5" fill="#06B6D4" opacity="0.8">K={K}</text>

          {/* Spill markers */}
          {spillPoints.map((sp) => {
            const x = width > 1 ? (sp.instructionId / (width - 1)) * 100 : 50
            return (
              <line
                key={sp.instructionId}
                x1={x} y1="0" x2={x} y2="100"
                stroke="#EF4444" strokeWidth="0.4" opacity="0.4"
              />
            )
          })}

          {/* Pressure line */}
          {pathD && (
            <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Data points */}
          {points.map(({ x, y, point }, i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={highlightedInstruction === i ? 2.5 : 1.2}
              fill={point.pressure > K ? "#EF4444" : point.isSpillPoint ? "#F97316" : "#06B6D4"}
              className="cursor-pointer transition-all"
              onClick={() => onSelectInstruction?.(point.instructionId)}
            >
              <title>{`I${point.instructionId}: "${point.instructionText}" | Pressure: ${point.pressure}/${K}`}</title>
            </circle>
          ))}
        </svg>

        {/* Instruction labels */}
        <div className="flex justify-between mt-1">
          <span className="text-[9px] font-mono text-muted">I0</span>
          <span className="text-[9px] font-mono text-muted">I{pressureTimeline.length - 1}</span>
        </div>
      </div>

      {/* Spill trigger list */}
      {spillPoints.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            Pressure Overflow Points ({spillPoints.length})
          </h4>
          {spillPoints.map((sp) => (
            <div
              key={sp.instructionId}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-red-500/10 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition-colors"
              onClick={() => onSelectInstruction?.(sp.instructionId)}
            >
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-mono text-red-400">{sp.pressure}</span>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-white/80 truncate">{sp.instructionText}</div>
                <div className="text-[10px] text-red-400/70">
                  I{sp.instructionId}: {sp.pressure} variables live, K={K} registers available
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {overPressureCount === 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-reg-green/20 bg-reg-green/5">
          <CheckCircle className="w-4 h-4 text-reg-green" />
          <span className="text-xs text-reg-green">Register pressure stays within K={K} throughout the program — no spills triggered by pressure!</span>
        </div>
      )}
    </div>
  )
}
