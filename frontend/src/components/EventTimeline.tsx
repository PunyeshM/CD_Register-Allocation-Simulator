"use client"

import { useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { SimulationEvent } from "@/types"
import {
  Play, Pause, SkipBack, SkipForward, ChevronsLeft, ChevronsRight,
  Cpu, GitBranch, Network, Palette, AlertTriangle, Zap, Activity
} from "lucide-react"

const EVENT_COLORS: Record<string, string> = {
  InstructionExecuted: "#06B6D4",
  VariableDefined: "#22C55E",
  VariableUsed: "#3B82F6",
  VariableBecomesLive: "#A78BFA",
  VariableDies: "#64748B",
  InterferenceCreated: "#F59E0B",
  NodeSimplified: "#06B6D4",
  NodePushed: "#8B5CF6",
  NodePopped: "#EC4899",
  ColorAssigned: "#22C55E",
  SpillDetected: "#EF4444",
  SpillInserted: "#F97316",
  RegisterAllocated: "#10B981",
  PhaseStarted: "#06B6D4",
  PhaseCompleted: "#A855F7",
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  InstructionExecuted: Cpu,
  VariableDefined: Zap,
  VariableUsed: Activity,
  VariableBecomesLive: Activity,
  VariableDies: Activity,
  InterferenceCreated: Network,
  NodeSimplified: GitBranch,
  NodePushed: GitBranch,
  NodePopped: GitBranch,
  ColorAssigned: Palette,
  SpillDetected: AlertTriangle,
  SpillInserted: AlertTriangle,
  RegisterAllocated: Palette,
  PhaseStarted: Cpu,
  PhaseCompleted: Cpu,
}

interface EventTimelineProps {
  events: SimulationEvent[]
  cursor: number
  isPlaying: boolean
  speed: number
  onJump: (index: number) => void
  onPlay: () => void
  onPause: () => void
  onNext: () => void
  onPrev: () => void
  onSpeedChange: (speed: number) => void
}

export default function EventTimeline({
  events,
  cursor,
  isPlaying,
  speed,
  onJump,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onSpeedChange,
}: EventTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const currentEvent = cursor >= 0 && cursor < events.length ? events[cursor] : null

  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || events.length === 0) return
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const index = Math.floor(pct * events.length)
    onJump(Math.min(index, events.length - 1))
  }, [events.length, onJump])

  const progressPct = events.length > 0 ? ((cursor + 1) / events.length) * 100 : 0

  const phaseCounts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.phase] = (acc[e.phase] || 0) + 1
    return acc
  }, {})

  const phaseColors: Record<string, string> = {
    parsing: "#06B6D4",
    liveness: "#8B5CF6",
    interference: "#F59E0B",
    allocation: "#22C55E",
    complete: "#EC4899",
  }

  return (
    <div className="flex flex-col h-full bg-surface/40 border-t border-white/5">
      {/* Phase legend bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 overflow-x-auto scrollbar-none">
        <span className="text-[10px] text-muted font-mono shrink-0">Phases:</span>
        {Object.entries(phaseCounts).map(([phase, count]) => (
          <div key={phase} className="flex items-center gap-1.5 shrink-0">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: phaseColors[phase] || "#64748B" }} />
            <span className="text-[10px] text-white/60 capitalize font-mono">{phase} ({count})</span>
          </div>
        ))}
        <div className="ml-auto shrink-0 text-[10px] font-mono text-muted">
          {cursor + 1} / {events.length} events
        </div>
      </div>

      {/* Timeline track */}
      <div className="px-4 py-3">
        <div
          ref={trackRef}
          className="relative h-8 rounded-lg bg-white/[0.03] border border-white/5 cursor-pointer overflow-hidden group"
          onClick={handleTrackClick}
        >
          {/* Phase segments */}
          {events.length > 0 && (() => {
            const segments: { phase: string; start: number; count: number }[] = []
            let current = events[0].phase
            let start = 0
            for (let i = 1; i <= events.length; i++) {
              if (i === events.length || events[i].phase !== current) {
                segments.push({ phase: current, start, count: i - start })
                if (i < events.length) { current = events[i].phase; start = i }
              }
            }
            return segments.map((seg) => (
              <div
                key={`${seg.phase}-${seg.start}`}
                className="absolute top-0 h-full opacity-20"
                style={{
                  left: `${(seg.start / events.length) * 100}%`,
                  width: `${(seg.count / events.length) * 100}%`,
                  backgroundColor: phaseColors[seg.phase] || "#64748B",
                }}
              />
            ))
          })()}

          {/* Event dots */}
          {events.map((evt, i) => {
            const Icon = EVENT_ICONS[evt.type] || Activity
            const color = EVENT_COLORS[evt.type] || "#64748B"
            const isCurrent = i === cursor
            const isPast = i < cursor
            return (
              <div
                key={evt.id}
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-150"
                style={{ left: `${(i / Math.max(events.length - 1, 1)) * 100}%` }}
                onClick={(e) => { e.stopPropagation(); onJump(i) }}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-all ${isCurrent ? "w-3 h-3 ring-2 ring-white/30" : ""}`}
                  style={{
                    backgroundColor: isPast || isCurrent ? color : `${color}40`,
                    boxShadow: isCurrent ? `0 0 8px ${color}` : undefined,
                  }}
                />
              </div>
            )
          })}

          {/* Progress fill */}
          <div
            className="absolute top-0 left-0 h-full transition-all duration-100 pointer-events-none"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, rgba(6,182,212,0.08) 0%, rgba(139,92,246,0.08) 100%)",
              borderRight: "2px solid rgba(6,182,212,0.6)",
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onJump(0)}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all"
            title="Jump to start"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onPrev}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all"
            title="Previous event"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="p-2 rounded-lg bg-accent1/20 text-accent1 hover:bg-accent1/30 transition-all"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onNext}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all"
            title="Next event"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onJump(events.length - 1)}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all"
            title="Jump to end"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-2 ml-2">
          <span className="text-[10px] text-muted font-mono">Speed:</span>
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                speed === s
                  ? "bg-accent1/20 text-accent1 border border-accent1/30"
                  : "text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Current event info */}
        {currentEvent && (
          <motion.div
            key={currentEvent.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="ml-auto flex items-center gap-2"
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: EVENT_COLORS[currentEvent.type] || "#64748B" }}
            />
            <span className="text-[10px] font-mono text-white/70">{currentEvent.type}</span>
            {currentEvent.variable && (
              <span className="text-[10px] font-mono text-accent1">{currentEvent.variable}</span>
            )}
            <span className="text-[10px] text-muted capitalize">[{currentEvent.phase}]</span>
          </motion.div>
        )}
      </div>

      {/* Current event detail */}
      {currentEvent?.explanation && (
        <motion.div
          key={currentEvent.id + "-exp"}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mx-4 mb-3 px-3 py-2 rounded-lg border border-white/5 bg-white/[0.02] text-[11px] text-white/70 font-mono leading-relaxed"
        >
          {currentEvent.explanation}
        </motion.div>
      )}
    </div>
  )
}
