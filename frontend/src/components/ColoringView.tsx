"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Pause, SkipBack, SkipForward, Info, Layers } from "lucide-react"
import { Button } from "./ui/button"
import { Slider } from "./ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { AllocationStep } from "@/types"
import { getRegisterName, getRegisterColor } from "@/lib/utils"
import InterferenceGraphView from "./InterferenceGraphView"
import { InterferenceGraphData } from "@/types"

interface ColoringViewProps {
  steps: AllocationStep[]
  graph: InterferenceGraphData
}

export default function ColoringView({ steps, graph }: ColoringViewProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  const handlePlayPause = useCallback(() => {
    if (playing) {
      setPlaying(false)
    } else if (currentStep >= steps.length - 1) {
      setCurrentStep(0)
      setPlaying(true)
    } else {
      setPlaying(true)
    }
  }, [playing, currentStep, steps.length])

  useEffect(() => {
    if (!playing) return
    if (currentStep >= steps.length - 1) {
      setPlaying(false)
      return
    }
    const interval = setInterval(() => {
      setCurrentStep((p) => {
        if (p >= steps.length - 1) {
          clearInterval(interval)
          setPlaying(false)
          return p
        }
        return p + 1
      })
    }, 600)
    return () => clearInterval(interval)
  }, [playing, currentStep, steps.length])

  const step = steps[currentStep]
  const assignment = step?.currentAssignment || {}
  const stack = step?.currentStack || []
  const spillCands = step?.spillCandidates || []

  // Build assignment map for graph
  const graphAssignment: Record<string, number> = {}
  for (const [v, r] of Object.entries(assignment)) {
    graphAssignment[v] = r
  }

  const stepConfig: Record<string, { color: string; icon: string; label: string }> = {
    SIMPLIFY_PUSH: { color: "text-reg-blue", icon: "↓", label: "PUSH" },
    SIMPLIFY_SPILL: { color: "text-reg-orange", icon: "⚠", label: "SPILL" },
    ASSIGN: { color: "text-reg-green", icon: "✓", label: "ASSIGN" },
    SPILL_DETECTED: { color: "text-red-400", icon: "✗", label: "SPILL" },
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3 bg-surface2/30 rounded-xl p-3 border border-white/5">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setCurrentStep(0); setPlaying(false) }}
          disabled={steps.length === 0}
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handlePlayPause}>
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setCurrentStep((p) => Math.min(p + 1, steps.length - 1))}
          disabled={currentStep >= steps.length - 1}
        >
          <SkipForward className="w-4 h-4" />
        </Button>
        <div className="h-5 w-px bg-white/10 mx-2" />
        <span className="text-xs text-muted font-mono">
          Step {currentStep + 1} / {steps.length}
        </span>
        <div className="flex-1" />
        <Slider
          className="w-32"
          min={0}
          max={Math.max(0, steps.length - 1)}
          value={[currentStep]}
          onValueChange={([v]) => { setCurrentStep(v); setPlaying(false) }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Step Log */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {/* Current Step */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl border border-accent1/20 bg-accent1/5 p-4"
          >
            {step && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-lg ${stepConfig[step.type]?.color ?? "text-white"}`}>
                    {stepConfig[step.type]?.icon ?? "•"}
                  </span>
                  <span className="text-xs font-mono text-muted uppercase">
                    {stepConfig[step.type]?.label ?? "STEP"}
                  </span>
                </div>
                <p className="text-sm text-white/90 font-mono">{step.message}</p>
              </>
            )}
          </motion.div>

          {/* Simplification Stack */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-accent1" />
              <span className="text-sm font-semibold text-white">Simplification Stack</span>
            </div>
            <div className="rounded-xl border border-white/5 bg-surface/50 p-3 min-h-[120px]">
              {stack.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">Stack empty</p>
              ) : (
                <div className="flex flex-col-reverse gap-1">
                  {stack.map((v, i) => (
                    <motion.div
                      key={v + i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] text-xs font-mono"
                    >
                      <span className="text-white/60">{i}.</span>
                      <span className={`${spillCands.includes(v) ? "text-reg-orange" : "text-white/90"}`}>
                        {v}
                      </span>
                      {spillCands.includes(v) && (
                        <span className="text-reg-orange text-[10px]">(spill candidate)</span>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Assignment Table */}
          {Object.keys(assignment).length > 0 && (
            <div>
              <span className="text-sm font-semibold text-white mb-2 block">Current Assignments</span>
              <div className="rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface2/50 border-b border-white/5">
                      <th className="text-left px-3 py-2 text-muted font-mono">Variable</th>
                      <th className="text-left px-3 py-2 text-muted font-mono">Register</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(assignment).map(([v, r]) => (
                      <tr key={v} className="border-b border-white/[0.02]">
                        <td className="px-3 py-2 font-mono text-white/80">{v}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: r >= 0 ? getRegisterColor(r) : "#EF4444" }}
                            />
                            <span className="font-mono" style={{ color: r >= 0 ? getRegisterColor(r) : "#EF4444" }}>
                              {r >= 0 ? getRegisterName(r) : "SPILL"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Spill Candidates */}
          {spillCands.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <span className="text-xs font-semibold text-red-400">Spill Candidates</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {spillCands.map((v) => (
                  <span key={v} className="px-2 py-1 rounded bg-red-500/10 text-red-300 text-xs font-mono">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Graph */}
        <div className="lg:col-span-3">
          <InterferenceGraphView graph={graph} assignment={graphAssignment} />
        </div>
      </div>
    </div>
  )
}
