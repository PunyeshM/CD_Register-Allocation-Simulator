"use client"

import { motion } from "framer-motion"
import { CheckCircle, Circle, ChevronRight, Code, Cpu, Network, Palette, AlertTriangle, GitBranch, Box, Terminal } from "lucide-react"

interface PipelineStage {
  id: string
  label: string
  sublabel: string
  icon: React.ElementType
  color: string
  tab?: string
}

const STAGES: PipelineStage[] = [
  { id: "source", label: "Source Code", sublabel: "Input program", icon: Code, color: "#64748B" },
  { id: "lexer", label: "Lexer", sublabel: "Tokenization", icon: Code, color: "#6366F1" },
  { id: "parser", label: "Parser", sublabel: "Syntax analysis", icon: Code, color: "#8B5CF6" },
  { id: "ast", label: "AST", sublabel: "Abstract syntax tree", icon: GitBranch, color: "#A855F7" },
  { id: "ir", label: "LLVM IR", sublabel: "Intermediate representation", icon: Box, color: "#06B6D4", tab: "editor" },
  { id: "cfg", label: "CFG", sublabel: "Control flow graph", icon: GitBranch, color: "#22D3EE", tab: "cfg" },
  { id: "liveness", label: "Liveness Analysis", sublabel: "Live-in / Live-out sets", icon: Cpu, color: "#8B5CF6", tab: "liveness" },
  { id: "interference", label: "Interference Graph", sublabel: "Variable conflicts", icon: Network, color: "#F59E0B", tab: "interference" },
  { id: "allocation", label: "Register Allocation", sublabel: "Chaitin coloring", icon: Palette, color: "#22C55E", tab: "coloring" },
  { id: "machine", label: "Machine Code", sublabel: "Physical register assignment", icon: Terminal, color: "#10B981", tab: "machine" },
]

interface PipelineViewProps {
  activeTab?: string
  completedStages?: string[]
  onNavigate?: (tab: string) => void
  hasResult?: boolean
}

export default function PipelineView({ activeTab, completedStages = [], onNavigate, hasResult }: PipelineViewProps) {
  const getStatus = (stage: PipelineStage) => {
    if (!hasResult) return "idle"
    if (stage.tab && stage.tab === activeTab) return "active"
    if (completedStages.includes(stage.id)) return "done"
    if (["source", "lexer", "parser", "ast"].includes(stage.id)) return "done"
    if (hasResult && ["ir", "cfg", "liveness", "interference", "allocation", "machine"].includes(stage.id)) return "done"
    return "idle"
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-white px-1">Compiler Pipeline</h3>
      <div className="space-y-1">
        {STAGES.map((stage, i) => {
          const status = getStatus(stage)
          const isClickable = !!stage.tab && hasResult
          const isActive = status === "active" || (stage.tab && stage.tab === activeTab)
          const isDone = status === "done"

          return (
            <div key={stage.id} className="flex items-stretch gap-2">
              {/* Connector line */}
              <div className="flex flex-col items-center w-5 shrink-0">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isDone ? "bg-reg-green/20" : isActive ? "" : "bg-white/[0.04]"
                  }`}
                  style={isActive ? { backgroundColor: `${stage.color}25` } : {}}
                >
                  {isDone ? (
                    <CheckCircle className="w-3 h-3 text-reg-green" />
                  ) : isActive ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  )}
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`w-px flex-1 mt-0.5 ${isDone ? "bg-reg-green/20" : "bg-white/5"}`} />
                )}
              </div>

              {/* Stage card */}
              <motion.div
                whileHover={isClickable ? { x: 2 } : {}}
                className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg mb-0.5 transition-all ${
                  isClickable ? "cursor-pointer" : "cursor-default"
                } ${
                  isActive
                    ? "border border-white/10"
                    : isDone
                    ? "border border-white/[0.04] bg-white/[0.01]"
                    : "border border-transparent"
                }`}
                style={isActive ? { backgroundColor: `${stage.color}10`, borderColor: `${stage.color}30` } : {}}
                onClick={() => isClickable && stage.tab && onNavigate?.(stage.tab)}
              >
                <div className="flex items-center gap-2">
                  <stage.icon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: isDone || isActive ? stage.color : "#475569" }}
                  />
                  <div>
                    <div
                      className="text-[11px] font-semibold leading-tight"
                      style={{ color: isActive ? stage.color : isDone ? "#94A3B8" : "#475569" }}
                    >
                      {stage.label}
                    </div>
                    <div className="text-[9px] text-muted leading-tight">{stage.sublabel}</div>
                  </div>
                </div>
                {isClickable && (
                  <ChevronRight className="w-3 h-3 text-muted shrink-0" style={{ color: isActive ? stage.color : undefined }} />
                )}
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
