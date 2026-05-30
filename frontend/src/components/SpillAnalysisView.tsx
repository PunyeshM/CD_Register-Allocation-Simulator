"use client"

import { motion } from "framer-motion"
import { AlertTriangle, Info, Lightbulb, BarChart3 } from "lucide-react"
import { AllocationStep, InterferenceGraphData } from "@/types"

interface SpillAnalysisViewProps {
  steps: AllocationStep[]
  graph: InterferenceGraphData
  spillRequired: boolean
  spillCandidates: string[]
}

export default function SpillAnalysisView({
  steps,
  graph,
  spillRequired,
  spillCandidates,
}: SpillAnalysisViewProps) {
  if (!spillRequired) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-full bg-reg-green/10 flex items-center justify-center">
          <Lightbulb className="w-8 h-8 text-reg-green" />
        </div>
        <h3 className="text-lg font-semibold text-white">No Spills Required</h3>
        <p className="text-sm text-white/50 max-w-md text-center">
          The interference graph was successfully colored with {graph.K} registers.
          All variables have been assigned a physical register.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>Variables: {graph.variables.length}</span>
          <span>Edges: {graph.edges.length}</span>
          <span>K: {graph.K}</span>
        </div>
      </div>
    )
  }

  // Find the spill steps
  const spillSteps = steps.filter((s) => s.type === "SPILL_DETECTED" || s.type === "SIMPLIFY_SPILL")

  // Get variable degrees
  const varDegrees = graph.variables
    .map((v) => ({ var: v, degree: graph.degrees[v] || 0 }))
    .sort((a, b) => b.degree - a.degree)

  return (
    <div className="space-y-6">
      {/* Spill Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-orange-500/10 p-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-300 mb-1">Spill Required</h3>
            <p className="text-sm text-white/60">
              The interference graph could not be colored with only <strong className="text-white">{graph.K}</strong> registers.
              <strong className="text-red-400"> {spillCandidates.length} variable(s)</strong> must be spilled to memory.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spill Candidates */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-red-400" />
            Spill Candidates
          </h4>
          <div className="space-y-2">
            {spillCandidates.map((v, i) => (
              <motion.div
                key={v}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between rounded-lg border border-red-500/10 bg-red-500/5 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-red-300">{v}</span>
                  <span className="text-[10px] text-muted">
                    degree: {graph.degrees[v] || 0}
                  </span>
                </div>
                <span className="text-[10px] text-red-400 font-mono">SPILL</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Register Pressure Analysis */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-orange-400" />
            Register Pressure
          </h4>
          <div className="rounded-xl border border-white/5 bg-surface/50 p-4">
            <p className="text-xs text-white/60 mb-3">
              Variables sorted by interference degree. Higher degree = more register pressure.
            </p>
            <div className="space-y-1.5">
              {varDegrees.slice(0, 10).map(({ var: v, degree }) => (
                <div key={v} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-white/70 w-10">{v}</span>
                  <div className="flex-1 h-5 rounded-full bg-surface2/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, (degree / Math.max(1, varDegrees[0].degree)) * 100)}%`,
                      }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className={`h-full rounded-full ${
                        spillCandidates.includes(v)
                          ? "bg-gradient-to-r from-red-500 to-orange-500"
                          : "bg-gradient-to-r from-accent1 to-accent2"
                      }`}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted w-6">{degree}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Why Spill Occurred */}
      <div className="rounded-xl border border-white/5 bg-surface/50 p-5">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          Why Did the Spill Occur?
        </h4>
        <div className="space-y-3 text-xs text-white/60 leading-relaxed">
          <p>
            The Chaitin graph coloring algorithm removes nodes with degree less than{" "}
            <strong className="text-white">K = {graph.K}</strong> from the graph.
            When all remaining nodes have degree &ge; K, a spill candidate is chosen.
          </p>
          <p>
            In this case, <strong className="text-red-300">{spillCandidates.length} variable(s)</strong> had degree &ge; {graph.K}
            at the time of simplification, meaning they interfere with {graph.K} or more live variables simultaneously.
            With only {graph.K} physical registers available, at least one variable must be spilled to memory.
          </p>
          <p>
            <strong className="text-white">Spill heuristic:</strong> The algorithm picks the variable with the highest
            degree as the spill candidate (cheapest to spill).
          </p>
        </div>
      </div>

      {/* Spill Steps */}
      {spillSteps.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Spill Timeline</h4>
          <div className="space-y-2">
            {spillSteps.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-orange-500/10 bg-orange-500/5 p-3"
              >
                <span className="text-xs text-muted font-mono w-6">{i + 1}</span>
                <span className="text-xs font-mono text-orange-300">{s.variable}</span>
                <span className="text-xs text-white/50">{s.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
