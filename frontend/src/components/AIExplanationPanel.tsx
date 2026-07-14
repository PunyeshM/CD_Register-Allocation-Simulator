"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AgentExplanation, AgentType, AnalysisResult, TutorQA } from "@/types"
import { LivenessAgent } from "@/lib/agents/LivenessAgent"
import { ColoringAgent } from "@/lib/agents/ColoringAgent"
import { SpillAgent } from "@/lib/agents/SpillAgent"
import { GraphAgent } from "@/lib/agents/GraphAgent"
import { TutorAgent } from "@/lib/agents/TutorAgent"
import {
  Brain, Activity, Palette, AlertTriangle, Network, MessageSquare,
  Send, ChevronRight, Lightbulb, Info, Sparkles
} from "lucide-react"
import ReactMarkdown from "react-markdown"

const AGENT_TABS: { id: AgentType; label: string; icon: React.ElementType; color: string }[] = [
  { id: "liveness", label: "Liveness", icon: Activity, color: "#8B5CF6" },
  { id: "coloring", label: "Coloring", icon: Palette, color: "#22C55E" },
  { id: "spill", label: "Spill", icon: AlertTriangle, color: "#EF4444" },
  { id: "graph", label: "Graph", icon: Network, color: "#F59E0B" },
  { id: "tutor", label: "Tutor", icon: MessageSquare, color: "#06B6D4" },
]

interface AIExplanationPanelProps {
  result: AnalysisResult | null
  selectedVariable?: string | null
  selectedStep?: number | null
}

export default function AIExplanationPanel({
  result,
  selectedVariable,
  selectedStep,
}: AIExplanationPanelProps) {
  const [activeAgent, setActiveAgent] = useState<AgentType>("liveness")
  const [explanation, setExplanation] = useState<AgentExplanation | null>(null)
  const [chatInput, setChatInput] = useState("")
  const [chatHistory, setChatHistory] = useState<TutorQA[]>([])
  const [tutorSuggestions, setTutorSuggestions] = useState<string[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  const agents = result ? {
    liveness: new LivenessAgent(result.instructions, result.liveness.sets, result.liveness.liveRanges),
    coloring: new ColoringAgent(result.allocation.steps, result.interferenceGraph),
    spill: new SpillAgent(result.interferenceGraph, result.pressureTimeline ?? []),
    graph: new GraphAgent(result.interferenceGraph, result.instructions, result.liveness.sets),
    tutor: new TutorAgent(result),
  } : null

  // Auto-explain when variable or step changes
  useEffect(() => {
    if (!agents || !result) return
    if (selectedVariable) {
      switch (activeAgent) {
        case "liveness":
          setExplanation(agents.liveness.explainVariable(selectedVariable)); break
        case "coloring":
          setExplanation(agents.coloring.explainStep(
            result.allocation.steps.findIndex(s => s.variable === selectedVariable)
          )); break
        case "spill":
          setExplanation(agents.spill.explainSpill(selectedVariable)); break
        case "graph":
          setExplanation(agents.graph.explainNode(selectedVariable)); break
      }
    } else if (activeAgent !== "tutor") {
      // Show overview explanation
      switch (activeAgent) {
        case "liveness":
          if (result.interferenceGraph.variables[0])
            setExplanation(agents.liveness.explainVariable(result.interferenceGraph.variables[0]))
          break
        case "coloring":
          setExplanation(agents.coloring.explainColoringOrder(
            result.allocation.steps.filter(s => s.type === "SIMPLIFY_PUSH").map(s => s.variable)
          )); break
        case "spill":
          setExplanation(agents.spill.explainOverallPressure()); break
        case "graph":
          setExplanation(agents.graph.explainGraphStructure()); break
      }
    }
  }, [selectedVariable, activeAgent, result])

  // Load tutor suggestions
  useEffect(() => {
    if (agents) {
      setTutorSuggestions(agents.tutor.getSuggestions())
    }
  }, [result])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory])

  const handleSend = async () => {
    if (!chatInput.trim() || !agents) return
    const input = chatInput
    setChatInput("")

    const loadingQA: TutorQA = { 
      question: input, 
      answer: "Thinking...", 
      agent: "tutor", 
      relatedConcepts: [] 
    }
    setChatHistory(prev => [...prev, loadingQA])

    try {
      const qa = await agents.tutor.answer(input)
      setChatHistory(prev => [...prev.slice(0, -1), qa])
    } catch (error) {
      setChatHistory(prev => [...prev.slice(0, -1), { 
        question: input, 
        answer: "Sorry, there was an error connecting to the AI.", 
        agent: "tutor", 
        relatedConcepts: [] 
      }])
    }
  }

  const handleSuggestion = async (q: string) => {
    if (!agents) return
    
    const loadingQA: TutorQA = { 
      question: q, 
      answer: "Thinking...", 
      agent: "tutor", 
      relatedConcepts: [] 
    }
    setChatHistory(prev => [...prev, loadingQA])

    try {
      const qa = await agents.tutor.answer(q)
      setChatHistory(prev => [...prev.slice(0, -1), qa])
    } catch (error) {
      setChatHistory(prev => [...prev.slice(0, -1), { 
        question: q, 
        answer: "Sorry, there was an error connecting to the AI.", 
        agent: "tutor", 
        relatedConcepts: [] 
      }])
    }
  }

  const agentColor = AGENT_TABS.find(a => a.id === activeAgent)?.color ?? "#06B6D4"

  return (
    <div className="flex flex-col h-full">
      {/* Agent tabs */}
      <div className="flex gap-1 p-2 border-b border-white/5 overflow-x-auto shrink-0 pb-3 scroll-smooth">
        {AGENT_TABS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setActiveAgent(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all ${
              activeAgent === id
                ? "text-white"
                : "text-muted hover:text-white hover:bg-white/5"
            }`}
            style={activeAgent === id ? { backgroundColor: `${color}20`, color } : {}}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-smooth p-3 space-y-3 min-w-0">
        {!result && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-accent1/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-accent1" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AI Agents Ready</p>
              <p className="text-xs text-muted mt-1">Run analysis to activate the explanation agents</p>
            </div>
          </div>
        )}

        {result && activeAgent !== "tutor" && (
          <AnimatePresence mode="wait">
            {explanation ? (
              <motion.div
                key={explanation.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {/* Selected variable context */}
                {selectedVariable && (
                  <div className="flex items-center gap-2 text-[10px] text-muted">
                    <ChevronRight className="w-3 h-3" />
                    <span>Explaining variable:</span>
                    <span className="font-mono" style={{ color: agentColor }}>{selectedVariable}</span>
                  </div>
                )}

                {/* Explanation card */}
                <div
                  className="rounded-xl border p-3 space-y-2"
                  style={{ borderColor: `${agentColor}30`, backgroundColor: `${agentColor}08` }}
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: agentColor }} />
                    <div>
                      <h4 className="text-xs font-semibold text-white">{explanation.title}</h4>
                      <p className="text-[11px] text-white/70 mt-1.5 leading-relaxed">{explanation.text}</p>
                    </div>
                  </div>

                  {explanation.detail && (
                    <div className="mt-2 px-2 py-1.5 rounded-lg bg-white/[0.03] font-mono text-[10px] text-muted">
                      {explanation.detail}
                    </div>
                  )}

                  {explanation.tips && explanation.tips.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {explanation.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px] text-white/50">
                          <Lightbulb className="w-2.5 h-2.5 mt-0.5 shrink-0 text-yellow-400" />
                          {tip}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span
                      className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                      style={{ color: agentColor, backgroundColor: `${agentColor}15` }}
                    >
                      {AGENT_TABS.find(a => a.id === activeAgent)?.label} Agent
                    </span>
                    <span className="text-[9px] text-muted">confidence: {explanation.confidence}</span>
                  </div>
                </div>

                {/* Related variables */}
                {explanation.relatedVariables && explanation.relatedVariables.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted mb-1.5">Related variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {explanation.relatedVariables.map(v => (
                        <span
                          key={v}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-white/60 cursor-pointer hover:text-white hover:border-white/20 transition-colors"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick actions for other variables */}
                {!selectedVariable && activeAgent === "liveness" && (
                  <div>
                    <p className="text-[10px] text-muted mb-1.5">Click a variable to explain:</p>
                    <div className="flex flex-wrap gap-1">
                      {result.interferenceGraph.variables.map(v => (
                        <button
                          key={v}
                          onClick={() => {
                            if (agents) setExplanation(agents.liveness.explainVariable(v))
                          }}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-accent1/40 transition-colors"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="text-xs text-muted text-center py-8">
                Select a variable or click an element to get an explanation.
              </div>
            )}
          </AnimatePresence>
        )}

        {/* Tutor chat */}
        {result && activeAgent === "tutor" && (
          <div className="flex flex-col gap-4">
            {chatHistory.length === 0 && (
              <div>
                <p className="text-[10px] text-muted mb-2">Suggested questions:</p>
                <div className="space-y-1.5">
                  {tutorSuggestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(q)}
                      className="w-full text-left text-[11px] text-white/60 px-3 py-2 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:text-white transition-all flex items-start gap-2"
                    >
                      <ChevronRight className="w-3 h-3 mt-0.5 text-accent1 shrink-0" />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-6 pb-4">
              {chatHistory.map((qa, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* User Message */}
                  <div className="flex items-start justify-end gap-2.5 ml-6">
                    <div className="bg-accent2/15 border border-accent2/20 rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[12px] text-white/95 shadow-sm backdrop-blur-sm">
                      {qa.question}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-accent2/20 border border-accent2/30 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                      <span className="text-[10px] text-accent2 font-bold">U</span>
                    </div>
                  </div>

                  {/* AI Message */}
                  <div className="flex items-start gap-2.5 mr-2">
                    <div className="w-6 h-6 rounded-full bg-accent1/20 border border-accent1/30 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                      <Brain className="w-3.5 h-3.5 text-accent1" />
                    </div>
                    <div className="bg-surface2/60 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3.5 text-[13px] text-white/90 shadow-sm backdrop-blur-md flex-1">
                      {qa.answer === "Thinking..." ? (
                        <div className="flex items-center gap-1.5 h-5 px-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent1/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-accent1/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-accent1/70 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-background/80 prose-pre:border prose-pre:border-white/10 prose-pre:overflow-x-auto prose-pre:custom-scrollbar prose-pre:pb-1.5 prose-headings:text-accent1 prose-strong:text-white prose-a:text-accent3 break-words">
                          <ReactMarkdown>{qa.answer}</ReactMarkdown>
                        </div>
                      )}
                      
                      {qa.relatedConcepts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-white/10">
                          {qa.relatedConcepts.map(c => (
                            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-accent1/10 text-accent1/90 border border-accent1/20 font-mono transition-colors hover:bg-accent1/20 hover:text-accent1 cursor-default">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={chatEndRef} className="h-2" />
            </div>
          </div>
        )}
      </div>

      {/* Chat input (tutor mode only) */}
      {activeAgent === "tutor" && result && (
        <div className="shrink-0 p-3 border-t border-white/5">
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Ask about register allocation..."
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-muted focus:outline-none focus:border-accent1/40"
            />
            <button
              onClick={handleSend}
              disabled={!chatInput.trim()}
              className="p-2 rounded-lg bg-accent1/20 text-accent1 hover:bg-accent1/30 disabled:opacity-40 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
