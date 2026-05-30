"use client"

import { create } from "zustand"
import { AnalysisResult, SimulationEvent, AlgorithmComparisonResult } from "@/types"

interface SimulatorState {
  // IR & config
  ir: string
  registerCount: number
  algorithmMode: "CHAITIN" | "LINEAR_SCAN" | "OPTIMISTIC"

  // Result
  result: AnalysisResult | null
  loading: boolean
  error: string | null
  source: "api" | "local" | null

  // Event playback
  events: SimulationEvent[]
  cursor: number
  isPlaying: boolean
  playbackSpeed: number

  // Selection
  selectedVariable: string | null
  selectedStep: number | null
  selectedBlock: string | null

  // UI state
  activeTab: string
  rightPanelOpen: boolean
  leftPanelOpen: boolean
  theme: "dark" | "light"

  // Comparison
  comparisonResults: AlgorithmComparisonResult[]
  comparisonRunning: boolean

  // Actions
  setIr: (ir: string) => void
  setRegisterCount: (k: number) => void
  setResult: (result: AnalysisResult | null, source?: "api" | "local") => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  setActiveTab: (tab: string) => void
  setCursor: (cursor: number) => void
  setIsPlaying: (v: boolean) => void
  setPlaybackSpeed: (v: number) => void
  setSelectedVariable: (v: string | null) => void
  setSelectedStep: (v: number | null) => void
  setSelectedBlock: (v: string | null) => void
  toggleRightPanel: () => void
  toggleLeftPanel: () => void
  setTheme: (theme: "dark" | "light") => void
  setComparisonResults: (results: AlgorithmComparisonResult[]) => void
  setComparisonRunning: (v: boolean) => void
  nextEvent: () => void
  prevEvent: () => void
  resetPlayback: () => void
}

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  ir: `define i32 @example(i32 %a, i32 %b, i32 %c, i32 %d) {
entry:
  %1 = add i32 %a, %b
  %2 = mul i32 %1, %c
  %3 = sub i32 %2, %d
  ret i32 %3
}`,
  registerCount: 4,
  algorithmMode: "CHAITIN",

  result: null,
  loading: false,
  error: null,
  source: null,

  events: [],
  cursor: -1,
  isPlaying: false,
  playbackSpeed: 1,

  selectedVariable: null,
  selectedStep: null,
  selectedBlock: null,

  activeTab: "liveness",
  rightPanelOpen: true,
  leftPanelOpen: true,
  theme: "dark",

  comparisonResults: [],
  comparisonRunning: false,

  setIr: (ir) => set({ ir }),
  setRegisterCount: (k) => set({ registerCount: k }),
  setResult: (result, source = "local") => set({
    result,
    source,
    events: result?.events ?? [],
    cursor: -1,
    isPlaying: false,
    selectedVariable: null,
  }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCursor: (cursor) => set({ cursor }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setPlaybackSpeed: (v) => set({ playbackSpeed: v }),
  setSelectedVariable: (v) => set({ selectedVariable: v }),
  setSelectedStep: (v) => set({ selectedStep: v }),
  setSelectedBlock: (v) => set({ selectedBlock: v }),
  toggleRightPanel: () => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleLeftPanel: () => set(s => ({ leftPanelOpen: !s.leftPanelOpen })),
  setTheme: (theme) => set({ theme }),
  setComparisonResults: (results) => set({ comparisonResults: results }),
  setComparisonRunning: (v) => set({ comparisonRunning: v }),

  nextEvent: () => {
    const { cursor, events } = get()
    if (cursor < events.length - 1) set({ cursor: cursor + 1 })
  },
  prevEvent: () => {
    const { cursor } = get()
    if (cursor > 0) set({ cursor: cursor - 1 })
    else set({ cursor: -1 })
  },
  resetPlayback: () => set({ cursor: -1, isPlaying: false }),
}))
