"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Pause, SkipBack, SkipForward, Info } from "lucide-react"
import { Button } from "./ui/button"
import { Slider } from "./ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { LiveSet, LivenessIteration } from "@/types"
import { formatSet } from "@/lib/utils"

interface LivenessViewProps {
  instructions: { id: number; text: string }[]
  sets: LiveSet[]
  iterations: LivenessIteration[]
  liveRanges: Record<string, number[]>
}

export default function LivenessView({ instructions, sets, iterations, liveRanges }: LivenessViewProps) {
  const [playing, setPlaying] = useState(false)
  const [currentIter, setCurrentIter] = useState(iterations.length - 1)

  const displaySets = currentIter >= 0 && currentIter < iterations.length
    ? iterations[currentIter].state
    : sets

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3 bg-surface2/30 rounded-xl p-3 border border-white/5">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setCurrentIter(0)}
          disabled={iterations.length === 0}
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (playing) {
              setPlaying(false)
            } else {
              setPlaying(true)
              const interval = setInterval(() => {
                setCurrentIter((p) => {
                  if (p >= iterations.length - 1) {
                    clearInterval(interval)
                    setPlaying(false)
                    return p
                  }
                  return p + 1
                })
              }, 800)
            }
          }}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setCurrentIter((p) => Math.min(p + 1, iterations.length - 1))}
          disabled={currentIter >= iterations.length - 1}
        >
          <SkipForward className="w-4 h-4" />
        </Button>
        <div className="h-5 w-px bg-white/10 mx-2" />
        <span className="text-xs text-muted font-mono">
          Iteration {currentIter + 1} / {iterations.length}
        </span>
        {iterations.length > 0 && (
          <span className="text-xs text-muted">
            {iterations[currentIter]?.changed ? "● changed" : "✓ converged"}
          </span>
        )}
        <div className="flex-1" />
        <Slider
          className="w-32"
          min={0}
          max={Math.max(0, iterations.length - 1)}
          value={[currentIter]}
          onValueChange={([v]) => setCurrentIter(v)}
        />
      </div>

      {/* Instructions Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface2/50 border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs text-muted font-mono">#</th>
              <th className="text-left px-4 py-3 text-xs text-muted font-mono">Instruction</th>
              <th className="text-left px-4 py-3 text-xs text-muted font-mono">USE</th>
              <th className="text-left px-4 py-3 text-xs text-muted font-mono">DEF</th>
              <th className="text-left px-4 py-3 text-xs text-muted font-mono">LIVE-IN</th>
              <th className="text-left px-4 py-3 text-xs text-muted font-mono">LIVE-OUT</th>
            </tr>
          </thead>
          <tbody>
            {displaySets.map((ls, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 text-xs text-muted font-mono">{i}</td>
                <td className="px-4 py-3 text-xs text-white/90 font-mono">
                  <span className="text-accent1">{instructions[i]?.text || ""}</span>
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {ls.use.length > 0 ? (
                    <span className="text-reg-green font-bold">{formatSet(ls.use)}</span>
                  ) : (
                    <span className="text-white/20">∅</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {ls.def.length > 0 ? (
                    <span className="text-reg-orange font-bold">{formatSet(ls.def)}</span>
                  ) : (
                    <span className="text-white/20">∅</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {ls.liveIn.length > 0 ? (
                    <span className="text-reg-purple font-bold">{formatSet(ls.liveIn)}</span>
                  ) : (
                    <span className="text-white/20">∅</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {ls.liveOut.length > 0 ? (
                    <span className="text-reg-blue font-bold">{formatSet(ls.liveOut)}</span>
                  ) : (
                    <span className="text-white/20">∅</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Live Ranges */}
      {Object.keys(liveRanges).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-white">Live Ranges</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-muted" />
                </TooltipTrigger>
                <TooltipContent>
                  Shows which instructions each variable is live across
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="space-y-2">
            {Object.entries(liveRanges).map(([varName, range]) => (
              <div key={varName} className="flex items-center gap-3">
                <span className="text-xs font-mono text-white/70 w-10">{varName}</span>
                <div className="flex-1 h-7 rounded-lg bg-surface2/50 overflow-hidden flex items-center px-0.5 gap-px">
                  {Array.from({ length: instructions.length }, (_, i) => (
                    <div
                      key={i}
                      className={`h-4 rounded-sm flex-1 transition-all duration-300 ${
                        range.includes(i)
                          ? "bg-gradient-to-b from-cyan-400 via-accent1 to-purple-500 shadow-lg shadow-accent1/30"
                          : "bg-white/[0.06] hover:bg-white/[0.1]"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted font-mono">
                  [{Math.min(...range)}-{Math.max(...range)}]
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-reg-green" />
          <span>USE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-reg-orange" />
          <span>DEF</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-reg-purple" />
          <span>LIVE-IN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-reg-blue" />
          <span>LIVE-OUT</span>
        </div>
      </div>
    </div>
  )
}
