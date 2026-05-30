"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  ArrowLeft, Cpu, Network, Palette, FlaskConical,
  ChevronRight, Download, Wifi, WifiOff, Server, Globe,
  AlertCircle, Loader2
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import IREditor from "@/components/IREditor"
import LivenessView from "@/components/LivenessView"
import InterferenceGraphView from "@/components/InterferenceGraphView"
import ColoringView from "@/components/ColoringView"
import SpillAnalysisView from "@/components/SpillAnalysisView"
import { analyzeIR, checkApiHealth, exportAsJSON, exportAsDOT, ApiStatus } from "@/lib/api"
import { AnalysisResult } from "@/types"

const SAMPLE_IR = `define i32 @example(i32 %a, i32 %b, i32 %c, i32 %d) {
entry:
  %1 = add i32 %a, %b
  %2 = mul i32 %1, %c
  %3 = sub i32 %2, %d
  ret i32 %3
}`

export default function SimulatorPage() {
  const [ir, setIr] = useState(SAMPLE_IR)
  const [registerCount, setRegisterCount] = useState(4)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("liveness")
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null)
  const [source, setSource] = useState<"api" | "local" | null>(null)
  const [checkingApi, setCheckingApi] = useState(true)

  // Check API health on mount
  useEffect(() => {
    setCheckingApi(true)
    checkApiHealth().then((status) => {
      setApiStatus(status)
      setCheckingApi(false)
    })
  }, [])

  const handleRun = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSource(null)
    try {
      const { result: res, source: src } = await analyzeIR(ir, registerCount)
      setResult(res)
      setSource(src)
      setActiveTab("liveness")
    } catch (err: any) {
      setError(err.message || "Analysis failed")
      console.error("Analysis error:", err)
    }
    setLoading(false)
  }, [ir, registerCount])

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case "liveness": return <Cpu className="w-3.5 h-3.5" />
      case "interference": return <Network className="w-3.5 h-3.5" />
      case "coloring": return <Palette className="w-3.5 h-3.5" />
      case "spill": return <FlaskConical className="w-3.5 h-3.5" />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-3 sm:px-6 h-12">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 text-white/60 hover:text-white transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-mono hidden sm:inline">Back</span>
            </Link>
            <div className="h-4 w-px bg-white/10 shrink-0" />
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Cpu className="w-4 h-4 text-accent1 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-white truncate">Register Alloc Simulator</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* API Status Indicator */}
            {checkingApi ? (
              <div className="flex items-center gap-1 text-[10px] text-muted">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="hidden xs:inline">Checking API...</span>
              </div>
            ) : apiStatus?.connected ? (
              <div className="flex items-center gap-1 text-[10px] text-reg-green">
                <Wifi className="w-3 h-3" />
                <span className="hidden sm:inline">API Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-reg-orange">
                <WifiOff className="w-3 h-3" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}
            {source && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted border-l border-white/10 pl-2 sm:pl-3">
                {source === "api" ? (
                  <><Server className="w-3 h-3 text-accent1" /> Server</>
                ) : (
                  <><Globe className="w-3 h-3 text-accent2" /> Local</>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-48px)]">
        {/* Left Panel - Editor */}
        <div className="w-full lg:w-[380px] xl:w-[420px] lg:border-r border-white/5 overflow-y-auto p-3 sm:p-4 space-y-4 shrink-0">
          <IREditor
            value={ir}
            onChange={setIr}
            onRun={handleRun}
            registerCount={registerCount}
            onRegisterCountChange={setRegisterCount}
            disabled={loading}
          />

          {/* Export buttons */}
          {result && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => exportAsJSON(result)}>
                <Download className="w-3 h-3 mr-1" />
                JSON
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => exportAsDOT(result)}>
                <Download className="w-3 h-3 mr-1" />
                DOT
              </Button>
            </div>
          )}

          {/* Stats */}
          {result && (
            <div className="rounded-xl border border-white/5 bg-surface/30 p-4">
              <span className="text-xs font-semibold text-white mb-3 block">Analysis Stats</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                  <div className="text-lg font-bold text-accent1 font-mono">{result.instructions.length}</div>
                  <div className="text-[10px] text-muted">Instructions</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                  <div className="text-lg font-bold text-accent2 font-mono">{result.interferenceGraph.variables.length}</div>
                  <div className="text-[10px] text-muted">Variables</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                  <div className="text-lg font-bold text-reg-green font-mono">{result.interferenceGraph.edges.length}</div>
                  <div className="text-[10px] text-muted">Edges</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                  <div className={`text-lg font-bold font-mono ${result.allocation.spillRequired ? "text-reg-red" : "text-reg-green"}`}>
                    {result.allocation.spillRequired ? "YES" : "NO"}
                  </div>
                  <div className="text-[10px] text-muted">Spill</div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-300">Analysis Error</p>
                <p className="text-[10px] text-red-200/70 mt-0.5">{error}</p>
                <Button size="sm" variant="ghost" className="h-6 mt-1 text-[10px] text-red-300" onClick={handleRun}>
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Visualization */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {loading ? (
            /* Loading State */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4">
                <div className="relative mx-auto mb-4 sm:mb-6 w-12 h-12 sm:w-16 sm:h-16">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent1/20 to-accent2/20 animate-pulse" />
                  <div className="absolute inset-2 rounded-full border-2 border-accent1/30 border-t-accent1 animate-spin" />
                </div>
                <p className="text-xs sm:text-sm font-mono text-white/60">
                  Analyzing with {apiStatus?.connected ? "backend server" : "local engine"}...
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mt-2 text-[10px] text-muted">
                  <div className="w-1 h-1 rounded-full bg-accent1 animate-pulse" />
                  <span>Parsing IR</span>
                  <div className="w-1 h-1 rounded-full bg-accent2 animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <span>Computing liveness</span>
                  <div className="w-1 h-1 rounded-full bg-accent1 animate-pulse" style={{ animationDelay: "0.4s" }} />
                  <span>Building graph</span>
                  <div className="w-1 h-1 rounded-full bg-accent2 animate-pulse" style={{ animationDelay: "0.6s" }} />
                  <span>Coloring</span>
                </div>
              </div>
            </div>
          ) : result ? (
            <>
              {/* Tabs */}
              <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 scrollbar-none">
                    <TabsList className="w-max sm:w-full justify-start gap-1 bg-transparent p-0 h-auto">
                      {["liveness", "interference", "coloring", "spill"].map((tab) => (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className="data-[state=active]:bg-surface2/50 data-[state=active]:shadow-none rounded-lg px-3 sm:px-4 py-2 text-[10px] sm:text-xs whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {getTabIcon(tab)}
                            <span className="capitalize">
                              {tab === "interference" ? "Interference" : tab === "spill" ? "Spill Analysis" : tab}
                            </span>
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto px-3 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4">
                    <TabsContent value="liveness" className="mt-0">
                      <motion.div key="liveness" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <LivenessView
                          instructions={result.instructions}
                          sets={result.liveness.sets}
                          iterations={result.liveness.iterations}
                          liveRanges={result.liveness.liveRanges}
                        />
                      </motion.div>
                    </TabsContent>

                    <TabsContent value="interference" className="mt-0">
                      <motion.div key="interference" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <InterferenceGraphView
                          graph={result.interferenceGraph}
                          assignment={Object.fromEntries(
                            Object.entries(result.allocation.assignment).map(([k, v]) => [k, v.register])
                          )}
                        />
                      </motion.div>
                    </TabsContent>

                    <TabsContent value="coloring" className="mt-0">
                      <motion.div key="coloring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <ColoringView steps={result.allocation.steps} graph={result.interferenceGraph} />
                      </motion.div>
                    </TabsContent>

                    <TabsContent value="spill" className="mt-0">
                      <motion.div key="spill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <SpillAnalysisView
                          steps={result.allocation.steps}
                          graph={result.interferenceGraph}
                          spillRequired={result.allocation.spillRequired}
                          spillCandidates={result.allocation.spillCandidates}
                        />
                      </motion.div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md px-4 sm:px-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-accent1/20 to-accent2/20 flex items-center justify-center">
                  <Cpu className="w-6 h-6 sm:w-8 sm:h-8 text-accent1" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-white mb-2">Ready to Simulate</h2>
                <p className="text-xs sm:text-sm text-white/50 mb-4 sm:mb-6 leading-relaxed">
                  Enter LLVM IR code on the left, choose your register count, and press{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-surface2 text-[10px] sm:text-xs font-mono text-accent1">Run</kbd>{" "}
                  or <kbd className="px-1.5 py-0.5 rounded bg-surface2 text-[10px] sm:text-xs font-mono text-accent1">Cmd+Enter</kbd>
                </p>
                <div className="flex flex-col items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted">
                  {apiStatus?.connected ? (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-reg-green">
                      <Wifi className="w-3 h-3" />
                      Backend server connected
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-reg-orange">
                      <WifiOff className="w-3 h-3" />
                      Using in-browser engine
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    <span>Watch liveness analysis propagate iteratively</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    <span>Explore the interference graph interactively</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    <span>Step through Chaitin graph coloring</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
