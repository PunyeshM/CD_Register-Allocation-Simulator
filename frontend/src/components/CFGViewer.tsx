"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import * as d3 from "d3"
import { CFGGraph } from "@/types"
import { GitBranch, RotateCcw } from "lucide-react"

interface CFGViewerProps {
  cfg: CFGGraph
  onSelectBlock?: (blockId: string) => void
  selectedBlock?: string | null
}

export default function CFGViewer({ cfg, onSelectBlock, selectedBlock }: CFGViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || cfg.blocks.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = svgRef.current.clientWidth || 500
    const height = 300
    const nodeW = 110
    const nodeH = 44

    const blockMap = new Map(cfg.blocks.map(b => [b.id, b]))

    // Layout: topological sort (simple layered)
    const layers: string[][] = []
    const visited = new Set<string>()
    const queue = [cfg.entry]
    while (queue.length > 0) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      const block = blockMap.get(id)
      if (!block) continue
      const layerIdx = layers.length === 0 ? 0 : Math.max(
        ...Array.from(visited).map(v => layers.findIndex(l => l.includes(v)))
      ) + 1
      if (!layers[layerIdx]) layers[layerIdx] = []
      layers[layerIdx].push(id)
      for (const s of block.successors) {
        if (!visited.has(s)) queue.push(s)
      }
    }

    // Position nodes
    const positions = new Map<string, { x: number; y: number }>()
    const layerH = 80
    layers.forEach((layer, li) => {
      layer.forEach((id, ni) => {
        const x = (width / (layer.length + 1)) * (ni + 1)
        const y = 30 + li * layerH
        positions.set(id, { x, y })
      })
    })

    // If no layers (single block), center it
    if (cfg.blocks.length === 1) {
      positions.set(cfg.blocks[0].id, { x: width / 2, y: 50 })
    }

    const container = svg.append("g")

    // Arrowhead marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#64748B")

    svg.append("defs").append("marker")
      .attr("id", "arrow-back")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#F97316")

    // Draw edges
    for (const edge of cfg.edges) {
      const srcPos = positions.get(edge.source)
      const tgtPos = positions.get(edge.target)
      if (!srcPos || !tgtPos) continue

      const isBackEdge = edge.isBackEdge
      const x1 = srcPos.x
      const y1 = srcPos.y + nodeH / 2
      const x2 = tgtPos.x
      const y2 = tgtPos.y - nodeH / 2

      if (isBackEdge) {
        // Curved back edge
        const cx = (x1 + x2) / 2 - 60
        const cy = (y1 + y2) / 2
        container.append("path")
          .attr("d", `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`)
          .attr("fill", "none")
          .attr("stroke", "#F97316")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4,3")
          .attr("marker-end", "url(#arrow-back)")
          .attr("opacity", 0.7)
      } else {
        container.append("line")
          .attr("x1", x1).attr("y1", y1)
          .attr("x2", x2).attr("y2", y2)
          .attr("stroke", "#475569")
          .attr("stroke-width", 1.5)
          .attr("marker-end", "url(#arrow)")
      }

      if (edge.label) {
        container.append("text")
          .attr("x", (x1 + x2) / 2 + 6)
          .attr("y", (y1 + y2) / 2)
          .attr("fill", isBackEdge ? "#F97316" : "#64748B")
          .attr("font-size", "9px")
          .attr("font-family", "monospace")
          .text(edge.label)
      }
    }

    // Draw nodes
    for (const block of cfg.blocks) {
      const pos = positions.get(block.id)
      if (!pos) continue

      const isSelected = selectedBlock === block.id
      const isEntry = block.isEntry
      const isExit = block.isExit
      const isLoop = block.isLoopHeader

      const nodeGroup = container.append("g")
        .attr("transform", `translate(${pos.x - nodeW / 2}, ${pos.y - nodeH / 2})`)
        .style("cursor", "pointer")
        .on("click", () => onSelectBlock?.(block.id))

      const borderColor = isEntry ? "#06B6D4" : isExit ? "#8B5CF6" : isLoop ? "#F97316" : "#334155"
      const fillColor = isSelected ? "rgba(6,182,212,0.15)" : "rgba(15,23,42,0.8)"

      nodeGroup.append("rect")
        .attr("width", nodeW)
        .attr("height", nodeH)
        .attr("rx", 8)
        .attr("fill", fillColor)
        .attr("stroke", borderColor)
        .attr("stroke-width", isSelected ? 2 : 1)

      if (isLoop) {
        nodeGroup.append("rect")
          .attr("x", 0).attr("y", 0).attr("width", nodeW).attr("height", 4)
          .attr("rx", 4)
          .attr("fill", "#F97316")
          .attr("opacity", 0.6)
      }

      nodeGroup.append("text")
        .attr("x", nodeW / 2)
        .attr("y", nodeH / 2 - 3)
        .attr("text-anchor", "middle")
        .attr("fill", "#F8FAFC")
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("font-family", "monospace")
        .text(block.label)

      nodeGroup.append("text")
        .attr("x", nodeW / 2)
        .attr("y", nodeH / 2 + 10)
        .attr("text-anchor", "middle")
        .attr("fill", "#64748B")
        .attr("font-size", "8.5px")
        .attr("font-family", "monospace")
        .text(`${block.instructions.length} instr${block.isLoopHeader ? " ↺" : ""}`)
    }

    // Zoom & pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3])
      .on("zoom", (event) => {
        container.attr("transform", event.transform.toString())
      })

    svg.call(zoom)
  }, [cfg, selectedBlock, onSelectBlock])

  if (cfg.blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted">
        No CFG data available.
      </div>
    )
  }

  const isTrivial = cfg.blocks.length === 1

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-accent1" />
          Control Flow Graph
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-muted">
          <span className="flex items-center gap-1"><div className="w-3 h-px border-t border-[#06B6D4]" /> Entry</span>
          <span className="flex items-center gap-1"><div className="w-3 h-px border-t border-[#8B5CF6]" /> Exit</span>
          <span className="flex items-center gap-1"><div className="w-3 h-px border-t border-dashed border-[#F97316]" /> Back Edge</span>
        </div>
      </div>

      {isTrivial && (
        <div className="text-[11px] text-muted px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
          This program has a single basic block — no branches or loops. CFG is trivial.
        </div>
      )}

      <div className="rounded-xl border border-white/5 bg-surface/30 overflow-hidden">
        <svg ref={svgRef} className="w-full" style={{ height: 300 }} />
      </div>

      {/* Block list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {cfg.blocks.map((block) => (
          <div
            key={block.id}
            className={`px-3 py-2 rounded-lg border cursor-pointer transition-all ${
              selectedBlock === block.id
                ? "border-accent1/40 bg-accent1/10"
                : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
            }`}
            onClick={() => onSelectBlock?.(block.id)}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-white">{block.label}</span>
              <div className="flex gap-1">
                {block.isEntry && <span className="text-[9px] text-accent1 font-mono">ENTRY</span>}
                {block.isExit && <span className="text-[9px] text-accent2 font-mono">EXIT</span>}
                {block.isLoopHeader && <span className="text-[9px] text-reg-orange font-mono">LOOP</span>}
              </div>
            </div>
            <div className="text-[10px] text-muted mt-0.5">
              {block.instructions.length} instructions
              {block.successors.length > 0 && ` → [${block.successors.join(", ")}]`}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
