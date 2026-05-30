"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  ArrowLeft, Cpu, Network, Palette, FlaskConical, Download, Wifi, WifiOff,
  Server, Globe, AlertCircle, Loader2, Play, Clock, GitBranch, BarChart3,
  Brain, Terminal, ChevronLeft, ChevronRight, Moon, Sun, SidebarOpen,
  SidebarClose, Maximize2, LayoutDashboard, Activity, Layers
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Existing components (enhanced)
import IREditor from "@/components/IREditor"
import LivenessView from "@/components/LivenessView"
import InterferenceGraphView from "@/components/InterferenceGraphView"
import ColoringView from "@/components/ColoringView"
import SpillAnalysisView from "@/components/SpillAnalysisView"

// New components
import EventTimeline from "@/components/EventTimeline"
import LiveRangeChart from "@/components/LiveRangeChart"
import RegisterFileView from "@/components/RegisterFileView"
import PressureChart from "@/components/PressureChart"
import CFGViewer from "@/components/CFGViewer"
import InterferenceGraph3D from "@/components/InterferenceGraph3D"
import PipelineView from "@/components/PipelineView"
import AIExplanationPanel from "@/components/AIExplanationPanel"
import AlgorithmCompare from "@/components/AlgorithmCompare"
import MachineCodeView from "@/components/MachineCodeView"

// Library
import { analyzeIR, checkApiHealth, exportAsJSON, exportAsDOT, ApiStatus } from "@/lib/api"
import { AllocatorEngine } from "@/lib/AllocatorEngine"
import { CFGGenerator } from "@/lib/CFGGenerator"
import { LinearScanAllocator } from "@/lib/LinearScanAllocator"
import { OptimisticColoringAllocator } from "@/lib/OptimisticColoringAllocator"
import { AnalysisResult, AlgorithmComparisonResult, SimulationEvent } from "@/types"
import { useSimulatorStore } from "@/store/simulatorStore"

const TABS = [
  { id: "liveness", label: "Liveness", icon: Cpu, color: "#8B5CF6" },
  { id: "liveranges", label: "Live Ranges", icon: Activity, color: "#06B6D4" },
  { id: "interference", label: "Graph", icon: Network, color: "#F59E0B" },
  { id: "coloring", label: "Coloring", icon: Palette, color: "#22C55E" },
  { id: "spill", label: "Spill", icon: FlaskConical, color: "#EF4444" },
  { id: "registers", label: "Registers", icon: Layers, color: "#3B82F6" },
  { id: "cfg", label: "CFG", icon: GitBranch, color: "#22D3EE" },
  { id: "timeline", label: "Timeline", icon: Clock, color: "#A855F7" },
  { id: "compare", label: "Compare", icon: BarChart3, color: "#F97316" },
  { id: "machine", label: "Machine Code", icon: Terminal, color: "#10B981" },
]

let playbackInterval: ReturnType<typeof setInterval> | null = null

export default function SimulatorPage() {
  const store = useSimulatorStore()
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null)
  const [checkingApi, setCheckingApi] = useState(true)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<"api" | "local" | null>(null)
  const [activeTab, setActiveTab] = useState("liveness")
  const [ir, setIr] = useState(store.ir)
  const [registerCount, setRegisterCount] = useState(store.registerCount)
  const [cursor, setCursor] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null)
  const [comparisonResults, setComparisonResults] = useState<AlgorithmComparisonResult[]>([])
  const [rightOpen, setRightOpen] = useState(true)
  const [leftOpen, setLeftOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const events: SimulationEvent[] = result?.events ?? []

  // API health check
  useEffect(() => {
    setCheckingApi(true)
    checkApiHealth().then(s => { setApiStatus(s); setCheckingApi(false) })
  }, [])

  // Playback ticker
  useEffect(() => {
    if (isPlaying && events.length > 0) {
      playbackInterval = setInterval(() => {
        setCursor(c => {
          if (c >= events.length - 1) {
            setIsPlaying(false)
            return c
          }
          return c + 1
        })
      }, Math.round(600 / playbackSpeed))
    } else {
      if (playbackInterval) clearInterval(playbackInterval)
    }
    return () => { if (playbackInterval) clearInterval(playbackInterval) }
  }, [isPlaying, playbackSpeed, events.length])

  const handleRun = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSource(null)
    setCursor(-1)
    setIsPlaying(false)
    setSelectedVariable(null)
    setComparisonResults([])

    try {
      // Run full local engine with event emission
      const engine = new AllocatorEngine(ir, registerCount)
      const localResult = engine.runAll()

      // Add CFG
      const cfgGen = new CFGGenerator(ir)
      localResult.cfg = cfgGen.generate()

      setResult(localResult)
      setSource("local")
      setActiveTab("liveness")

      // Also try API for potentially better result
      if (apiStatus?.connected) {
        try {
          const { result: apiResult } = await analyzeIR(ir, registerCount)
          // Merge API result with local events/cfg/lifecycle
          setResult({
            ...apiResult,
            events: localResult.events,
            cfg: localResult.cfg,
            pressureTimeline: localResult.pressureTimeline,
            variableLifecycles: localResult.variableLifecycles,
            machineCode: localResult.machineCode,
          })
          setSource("api")
        } catch {
          // keep local result
        }
      }

      // Run algorithm comparison
      const linearScan = new LinearScanAllocator(
        localResult.instructions,
        localResult.liveness.sets,
        registerCount
      )
      const optimistic = new OptimisticColoringAllocator(localResult.interferenceGraph)

      const chaitinResult: AlgorithmComparisonResult = {
        mode: "CHAITIN",
        label: "Chaitin Coloring",
        spillCount: localResult.allocation.spillCandidates.length,
        stepCount: localResult.allocation.steps.length,
        registerUtilization: Object.values(localResult.allocation.assignment)
          .filter(a => a.register >= 0).length / registerCount,
        assignment: localResult.allocation.assignment,
        spillCandidates: localResult.allocation.spillCandidates,
        steps: localResult.allocation.steps,
      }

      setComparisonResults([chaitinResult, linearScan.allocate(), optimistic.allocate()])
    } catch (err: any) {
      setError(err.message || "Analysis failed")
    }
    setLoading(false)
  }, [ir, registerCount, apiStatus])

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleRun() }
      if (e.key === "ArrowRight" && result) setCursor(c => Math.min(c + 1, events.length - 1))
      if (e.key === "ArrowLeft" && result) setCursor(c => Math.max(c - 1, -1))
      if (e.key === " " && result) { e.preventDefault(); setIsPlaying(p => !p) }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleRun, result, events.length])

  const handleExport = useCallback((type: "json" | "dot") => {
    if (!result) return
    type === "json" ? exportAsJSON(result) : exportAsDOT(result)
  }, [result])

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? "" : "light"}`}
      style={{ backgroundColor: darkMode ? "#0B1020" : "#F1F5F9" }}>

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center justify-between px-3 h-12">

          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-mono hidden sm:inline">Back</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-accent1" />
              <span className="text-sm font-bold text-white hidden md:inline">Compiler Visualization Platform</span>
              <span className="text-xs font-bold text-white md:hidden">CVP 2.0</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent1/15 text-accent1 font-mono">2.0</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* API status */}
            {checkingApi ? (
              <div className="flex items-center gap-1 text-[10px] text-muted">
                <Loader2 className="w-3 h-3 animate-spin" />
              </div>
            ) : apiStatus?.connected ? (
              <div className="flex items-center gap-1 text-[10px] text-reg-green">
                <Wifi className="w-3 h-3" />
                <span className="hidden sm:inline">API</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-reg-orange">
                <WifiOff className="w-3 h-3" />
                <span className="hidden sm:inline">Local</span>
              </div>
            )}

            {source && (
              <div className="hidden md:flex items-center gap-1 text-[10px] text-muted border-l border-white/10 pl-2">
                {source === "api" ? <Server className="w-3 h-3 text-accent1" /> : <Globe className="w-3 h-3 text-accent2" />}
                {source}
              </div>
            )}

            {/* Panel toggles */}
            <button onClick={() => setLeftOpen(v => !v)} className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all" title="Toggle left panel">
              {leftOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setRightOpen(v => !v)} className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all" title="Toggle right panel">
              {rightOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>

            {/* Theme toggle */}
            <button onClick={() => setDarkMode(v => !v)} className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all">
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Export */}
            {result && (
              <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                <button onClick={() => handleExport("json")} className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all text-[10px] flex items-center gap-1">
                  <Download className="w-3 h-3" /> JSON
                </button>
                <button onClick={() => handleExport("dot")} className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-all text-[10px] flex items-center gap-1">
                  <Download className="w-3 h-3" /> DOT
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN 3-COLUMN LAYOUT ────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL */}
        <AnimatePresence>
          {leftOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 border-r border-white/5 overflow-y-auto"
              style={{ width: 320 }}
            >
              <div className="p-3 space-y-4">
                {/* IR Editor */}
                <IREditor
                  value={ir}
                  onChange={setIr}
                  onRun={handleRun}
                  registerCount={registerCount}
                  onRegisterCountChange={setRegisterCount}
                  disabled={loading}
                />

                {/* Error */}
                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-300">Analysis Error</p>
                      <p className="text-[10px] text-red-200/70 mt-0.5">{error}</p>
                      <button onClick={handleRun} className="text-[10px] text-red-300 mt-1 underline">Retry</button>
                    </div>
                  </div>
                )}

                {/* Stats */}
                {result && (
                  <div className="rounded-xl border border-white/5 bg-surface/30 p-3">
                    <span className="text-[10px] font-semibold text-white mb-2 block">Analysis Stats</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Instructions", value: result.instructions.length, color: "text-accent1" },
                        { label: "Variables", value: result.interferenceGraph.variables.length, color: "text-accent2" },
                        { label: "Edges", value: result.interferenceGraph.edges.length, color: "text-reg-green" },
                        { label: "Spill", value: result.allocation.spillRequired ? "YES" : "NO", color: result.allocation.spillRequired ? "text-red-400" : "text-reg-green" },
                        { label: "Events", value: events.length, color: "text-accent1" },
                        { label: "K", value: registerCount, color: "text-accent2" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center p-2 rounded-lg bg-white/[0.02]">
                          <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
                          <div className="text-[9px] text-muted">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pipeline */}
                <PipelineView
                  activeTab={activeTab}
                  hasResult={!!result}
                  onNavigate={setActiveTab}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER PANEL */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="relative mx-auto mb-6 w-16 h-16">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent1/20 to-accent2/20 animate-pulse" />
                  <div className="absolute inset-2 rounded-full border-2 border-accent1/30 border-t-accent1 animate-spin" />
                </div>
                <p className="text-sm font-mono text-white/60">Analyzing with full event engine...</p>
                <div className="flex items-center justify-center gap-2 mt-3 text-[10px] text-muted flex-wrap">
                  {["Parsing IR", "Liveness analysis", "Building graph", "Graph coloring", "Generating events", "Running comparisons"].map((s, i) => (
                    <span key={s} className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-accent1 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : result ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Tab bar */}
              <div className="shrink-0 border-b border-white/5 overflow-x-auto scrollbar-none">
                <div className="flex gap-0.5 px-3 pt-2 w-max">
                  {TABS.map(({ id, label, icon: Icon, color }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-mono transition-all whitespace-nowrap border-b-2 ${
                        activeTab === id
                          ? "text-white border-b-current"
                          : "text-muted border-transparent hover:text-white hover:bg-white/5"
                      }`}
                      style={activeTab === id ? { borderBottomColor: color, color } : {}}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === "liveness" && (
                      <LivenessView
                        instructions={result.instructions}
                        sets={result.liveness.sets}
                        iterations={result.liveness.iterations}
                        liveRanges={result.liveness.liveRanges}
                      />
                    )}
                    {activeTab === "liveranges" && (
                      <LiveRangeChart
                        instructions={result.instructions}
                        liveSets={result.liveness.sets}
                        liveRanges={result.liveness.liveRanges}
                        assignment={result.allocation.assignment}
                        spillCandidates={result.allocation.spillCandidates}
                        selectedVariable={selectedVariable}
                        onSelectVariable={setSelectedVariable}
                      />
                    )}
                    {activeTab === "interference" && (
                      <InterferenceGraph3D
                        graph={result.interferenceGraph}
                        assignment={result.allocation.assignment}
                        spillCandidates={result.allocation.spillCandidates}
                        events={events}
                        cursor={cursor}
                        selectedVariable={selectedVariable}
                        onSelectVariable={setSelectedVariable}
                      />
                    )}
                    {activeTab === "coloring" && (
                      <ColoringView
                        steps={result.allocation.steps}
                        graph={result.interferenceGraph}
                      />
                    )}
                    {activeTab === "spill" && (
                      <div className="space-y-6">
                        <SpillAnalysisView
                          steps={result.allocation.steps}
                          graph={result.interferenceGraph}
                          spillRequired={result.allocation.spillRequired}
                          spillCandidates={result.allocation.spillCandidates}
                        />
                        {result.pressureTimeline && (
                          <PressureChart
                            pressureTimeline={result.pressureTimeline}
                            K={registerCount}
                            onSelectInstruction={(id) => setSelectedVariable(result.instructions[id]?.result ?? null)}
                          />
                        )}
                      </div>
                    )}
                    {activeTab === "registers" && (
                      <div className="space-y-6">
                        <RegisterFileView
                          K={registerCount}
                          events={events}
                          cursor={cursor}
                          assignment={result.allocation.assignment}
                          spillCandidates={result.allocation.spillCandidates}
                          onSelectVariable={setSelectedVariable}
                        />
                        {result.pressureTimeline && (
                          <PressureChart
                            pressureTimeline={result.pressureTimeline}
                            K={registerCount}
                          />
                        )}
                      </div>
                    )}
                    {activeTab === "cfg" && result.cfg && (
                      <CFGViewer
                        cfg={result.cfg}
                        onSelectBlock={(id) => setSelectedVariable(null)}
                      />
                    )}
                    {activeTab === "timeline" && (
                      <div className="space-y-4">
                        <div className="text-sm font-semibold text-white">Event Log</div>
                        <div className="space-y-1">
                          {events.map((evt, i) => (
                            <motion.div
                              key={evt.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: Math.min(i * 0.005, 0.5) }}
                              onClick={() => setCursor(i)}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all text-[11px] font-mono ${
                                cursor === i ? "bg-accent1/10 border border-accent1/20" : "hover:bg-white/[0.03]"
                              }`}
                            >
                              <span className="text-white/20 w-6 text-right shrink-0">{i}</span>
                              <span className="text-muted capitalize shrink-0 text-[10px]">[{evt.phase}]</span>
                              <span className="text-accent1 shrink-0">{evt.type}</span>
                              {evt.variable && <span className="text-accent2">{evt.variable}</span>}
                              {evt.explanation && <span className="text-white/40 truncate">{evt.explanation}</span>}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                    {activeTab === "compare" && (
                      <AlgorithmCompare results={comparisonResults} K={registerCount} />
                    )}
                    {activeTab === "machine" && (
                      <MachineCodeView result={result} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Event timeline bottom bar */}
              <div className="shrink-0" style={{ height: events.length > 0 ? "auto" : 0 }}>
                {events.length > 0 && (
                  <EventTimeline
                    events={events}
                    cursor={cursor}
                    isPlaying={isPlaying}
                    speed={playbackSpeed}
                    onJump={setCursor}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onNext={() => setCursor(c => Math.min(c + 1, events.length - 1))}
                    onPrev={() => setCursor(c => Math.max(c - 1, -1))}
                    onSpeedChange={setPlaybackSpeed}
                  />
                )}
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-lg px-6">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent1/20 to-accent2/20 flex items-center justify-center">
                  <LayoutDashboard className="w-10 h-10 text-accent1" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Compiler Visualization Platform</h2>
                <p className="text-sm text-white/50 mb-6 leading-relaxed">
                  Enter LLVM IR code in the editor, choose register count, and press{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-surface2 text-[11px] font-mono text-accent1">Run</kbd>{" "}
                  to launch the full simulation engine.
                </p>
                <div className="grid grid-cols-2 gap-3 text-left mb-6">
                  {[
                    { icon: Activity, label: "Event-driven simulation", desc: "13 event types, replayable" },
                    { icon: Brain, label: "5 AI explanation agents", desc: "Liveness, Graph, Spill, Tutor" },
                    { icon: Layers, label: "3D interference graph", desc: "Interactive, animated" },
                    { icon: BarChart3, label: "Algorithm comparison", desc: "Chaitin vs Linear Scan vs Optimistic" },
                    { icon: GitBranch, label: "CFG visualization", desc: "Basic blocks, loops, edges" },
                    { icon: Terminal, label: "Machine code output", desc: "Pseudo-assembly with spills" },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                      <div className="p-1.5 rounded-lg bg-accent1/10 shrink-0">
                        <Icon className="w-3.5 h-3.5 text-accent1" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">{label}</div>
                        <div className="text-[10px] text-muted">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button onClick={handleRun} size="lg" className="gap-2">
                  <Play className="w-4 h-4" />
                  Run Simulation
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — AI Agents */}
        <AnimatePresence>
          {rightOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 border-l border-white/5 overflow-hidden flex flex-col"
              style={{ width: 280 }}
            >
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5 shrink-0">
                <Brain className="w-4 h-4 text-accent1" />
                <span className="text-xs font-semibold text-white">AI Agents</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <AIExplanationPanel
                  result={result}
                  selectedVariable={selectedVariable}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
