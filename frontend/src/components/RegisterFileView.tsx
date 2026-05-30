"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RegisterSlot, SimulationEvent } from "@/types"

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

interface RegisterFileViewProps {
  K: number
  events: SimulationEvent[]
  cursor: number
  assignment: Record<string, { register: number; name: string }>
  spillCandidates: string[]
  onSelectVariable?: (v: string | null) => void
}

function buildRegFileAtCursor(
  K: number,
  events: SimulationEvent[],
  cursor: number,
  assignment: Record<string, { register: number; name: string }>
): RegisterSlot[] {
  const slots: RegisterSlot[] = Array.from({ length: K }, (_, i) => ({
    id: i,
    name: `R${i + 1}`,
    occupant: null,
    color: i,
    isSpill: false,
    animating: false,
  }))

  // Build register state up to cursor
  const eventsUpTo = events.slice(0, cursor + 1)
  for (const evt of eventsUpTo) {
    if (evt.type === "ColorAssigned" && evt.variable) {
      const color = evt.payload.color as number
      if (color >= 0 && color < K) {
        slots[color] = { ...slots[color], occupant: evt.variable, color, isSpill: false, animating: false }
      }
    }
    if (evt.type === "SpillDetected" && evt.variable) {
      // Mark as spilled — show in a special slot if space
    }
  }

  return slots
}

export default function RegisterFileView({
  K,
  events,
  cursor,
  assignment,
  spillCandidates,
  onSelectVariable,
}: RegisterFileViewProps) {
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)

  const slots = useMemo(
    () => buildRegFileAtCursor(K, events, cursor, assignment),
    [K, events, cursor, assignment]
  )

  const spilled = spillCandidates

  const regNames = ["RAX", "RBX", "RCX", "RDX", "RSI", "RDI", "R8", "R9"]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Register File</h3>
        <span className="text-[10px] font-mono text-muted">{K} physical registers</span>
      </div>

      {/* Register slots */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {slots.map((slot) => {
          const isOccupied = slot.occupant !== null
          const isHovered = hoveredSlot === slot.id
          const color = isOccupied ? REG_COLORS[slot.color] : undefined

          return (
            <motion.div
              key={slot.id}
              layout
              className={`relative rounded-xl border p-3 cursor-pointer transition-all duration-300 ${
                isOccupied
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-white/5 bg-white/[0.01]"
              } ${isHovered && isOccupied ? "scale-105" : ""}`}
              style={{
                boxShadow: isOccupied && color ? `0 0 20px ${color}20` : undefined,
              }}
              onMouseEnter={() => setHoveredSlot(slot.id)}
              onMouseLeave={() => setHoveredSlot(null)}
              onClick={() => isOccupied && onSelectVariable?.(slot.occupant)}
            >
              {/* Register name label */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-muted">{slot.name}</span>
                <span className="text-[9px] font-mono text-white/20">{regNames[slot.id] || `R${slot.id}`}</span>
              </div>

              {/* Occupant */}
              <AnimatePresence mode="popLayout">
                {isOccupied ? (
                  <motion.div
                    key={slot.occupant}
                    initial={{ opacity: 0, scale: 0.8, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-center justify-center"
                  >
                    <div
                      className="px-2 py-1 rounded-lg text-xs font-mono font-bold w-full text-center"
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                        border: `1px solid ${color}40`,
                      }}
                    >
                      {slot.occupant}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center h-7"
                  >
                    <span className="text-[10px] text-white/10 font-mono">— empty —</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Glow dot */}
              {isOccupied && (
                <div
                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: color }}
                />
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Spilled variables */}
      {spilled.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-400 mb-2">Spilled to Memory</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {spilled.map((v) => (
              <motion.div
                key={v}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-center cursor-pointer hover:bg-red-500/10 transition-colors"
                onClick={() => onSelectVariable?.(v)}
              >
                <div className="text-xs font-mono font-bold text-red-400">{v}</div>
                <div className="text-[9px] text-red-400/60 mt-0.5">mem[sp+N]</div>
              </motion.div>
            ))}
          </div>
          <p className="text-[10px] text-muted mt-2">
            These variables are stored on the stack. Every use requires a load instruction; every definition requires a store.
          </p>
        </div>
      )}

      {/* Final allocation summary */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <h4 className="text-xs font-semibold text-white mb-2">Final Register Assignment</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(assignment).map(([v, reg]) => (
            <div key={v} className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted">{v}</span>
              <span
                className="text-[11px] font-mono font-bold"
                style={{ color: reg.register >= 0 ? REG_COLORS[reg.register] : "#EF4444" }}
              >
                {reg.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
