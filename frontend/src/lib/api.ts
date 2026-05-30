import { AnalysisResult } from "@/types"
import { AllocatorEngine } from "./AllocatorEngine"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
const ANALYSIS_MODE = process.env.NEXT_PUBLIC_ANALYSIS_MODE || "auto"

export interface ApiStatus {
  connected: boolean
  url: string
  error?: string
}

/**
 * Check if the backend API server is reachable.
 */
export async function checkApiHealth(): Promise<ApiStatus> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(`${API_URL}/health`, {
      signal: controller.signal,
      method: "GET",
    })
    clearTimeout(timeout)

    if (res.ok) {
      return { connected: true, url: API_URL }
    }
    return { connected: false, url: API_URL, error: `Status ${res.status}` }
  } catch (err: any) {
    return { connected: false, url: API_URL, error: err.message || "Connection failed" }
  }
}

/**
 * Debug: check what the backend actually receives.
 */
export async function debugRequestBody(ir: string, registers: number): Promise<any> {
  try {
    const res = await fetch(`${API_URL}/debug-body`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ir, registers }),
    })
    return res.json()
  } catch (e) {
    return { error: String(e) }
  }
}

/**
 * Analyze IR via the backend API.
 */
export async function analyzeViaApi(ir: string, registers: number): Promise<AnalysisResult> {
  const payload = JSON.stringify({ ir, registers })
  console.log(`[API] POST ${API_URL}/analyze (${payload.length} bytes)`)

  const res = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: payload,
  })

  if (!res.ok) {
    const body = await res.text()
    // Try to get debug info
    let debugInfo = ""
    try {
      const debugRes = await fetch(`${API_URL}/debug-body`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      })
      debugInfo = await debugRes.text()
    } catch {}
    throw new Error(
      `API error (${res.status}): ${body}${debugInfo ? ` | debug: ${debugInfo.substring(0, 300)}` : ""}`
    )
  }

  return res.json()
}

/**
 * Analyze IR using the in-browser engine.
 */
export function analyzeLocally(ir: string, registers: number): AnalysisResult {
  const engine = new AllocatorEngine(ir, registers)
  return engine.runAll()
}

/**
 * Analyze IR using the best available method.
 * In "auto" mode, tries API first, falls back to local engine.
 */
export async function analyzeIR(
  ir: string,
  registers: number,
  mode: string = ANALYSIS_MODE
): Promise<{ result: AnalysisResult; source: "api" | "local" }> {
  if (mode === "local") {
    return { result: analyzeLocally(ir, registers), source: "local" }
  }

  try {
    const result = await analyzeViaApi(ir, registers)
    return { result, source: "api" }
  } catch (err) {
    console.warn("Backend API unavailable, falling back to local engine:", err)
    return { result: analyzeLocally(ir, registers), source: "local" }
  }
}

/**
 * Export analysis result as JSON file.
 */
export function exportAsJSON(result: AnalysisResult, filename = "register-allocation-analysis.json") {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export interference graph as DOT file.
 */
export function exportAsDOT(result: AnalysisResult, filename = "interference-graph.dot") {
  const { interferenceGraph, allocation } = result
  const colors = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#ec4899", "#14b8a6", "#eab308"]

  let dot = "graph Interference {\n"
  dot += "  layout=neato;\n"
  dot += "  overlap=false;\n"
  dot += "  splines=true;\n"
  dot += "  node [shape=circle, style=filled, fontcolor=white, fontsize=12];\n"

  for (const v of interferenceGraph.variables) {
    const reg = allocation.assignment[v]?.register ?? -1
    const color = reg >= 0 && reg < colors.length ? colors[reg] : "#4a5568"
    dot += `  "${v}" [fillcolor="${color}"];\n`
  }

  for (const e of interferenceGraph.edges) {
    dot += `  "${e.source}" -- "${e.target}";\n`
  }
  dot += "}\n"

  const blob = new Blob([dot], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
