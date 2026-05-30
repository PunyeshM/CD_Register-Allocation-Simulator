"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { ZoomIn, ZoomOut, RotateCcw, Download, Info } from "lucide-react"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { InterferenceGraphData } from "@/types"
import { getRegisterColor } from "@/lib/utils"

const EDGE_COLOR = "rgba(148, 163, 184, 0.5)"
const EDGE_HOVER_COLOR = "rgba(148, 163, 184, 0.9)"
const UNASSIGNED_NODE_COLOR = "#6B7280"
const UNASSIGNED_NODE_GLOW = "rgba(107, 114, 128, 0.4)"
const SPILL_NODE_COLOR = "#EF4444"
const SPILL_NODE_GLOW = "rgba(239, 68, 68, 0.5)"

interface InterferenceGraphViewProps {
  graph: InterferenceGraphData
  assignment?: Record<string, number>
}

export default function InterferenceGraphView({ graph, assignment = {} }: InterferenceGraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ w: 600, h: 400 })
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const hasAssignment = Object.keys(assignment).length > 0

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          w: containerRef.current.clientWidth,
          h: Math.max(400, containerRef.current.clientHeight),
        })
      }
    }
    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  useEffect(() => {
    if (!svgRef.current || graph.variables.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const { w, h } = dimensions
    const g = svg.append("g")

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })
    svg.call(zoom)
    zoomRef.current = zoom

    // Convert string variables to objects (D3 force simulation mutates nodes)
    const nodeData = graph.variables.map((id) => ({ id }))

    // Simulation
    const simulation = d3.forceSimulation(nodeData as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(graph.edges.map((e) => ({ source: e.source, target: e.target })))
        .id((d: any) => d.id)
        .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius(30))

    // Edges
    const link = g.append("g")
      .selectAll("line")
      .data(graph.edges)
      .join("line")
      .attr("stroke", EDGE_COLOR)
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round")

    // Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(nodeData)
      .join("g")
      .style("cursor", "grab")

    const colorMap: Record<string, string> = {}
    const glowMap: Record<string, string> = {}
    const isSpillMap: Record<string, boolean> = {}
    for (const v of graph.variables) {
      const reg = assignment[v]
      if (reg !== undefined && reg >= 0) {
        colorMap[v] = getRegisterColor(reg)
        const c = d3.color(colorMap[v])!
        glowMap[v] = `drop-shadow(0 0 10px ${c.copy({ opacity: 0.5 }).toString()})`
        isSpillMap[v] = false
      } else if (reg !== undefined && reg < 0) {
        colorMap[v] = SPILL_NODE_COLOR
        glowMap[v] = `drop-shadow(0 0 12px ${SPILL_NODE_GLOW})`
        isSpillMap[v] = true
      } else {
        colorMap[v] = UNASSIGNED_NODE_COLOR
        glowMap[v] = `drop-shadow(0 0 8px ${UNASSIGNED_NODE_GLOW})`
        isSpillMap[v] = false
      }
    }

    node.append("circle")
      .attr("r", 22)
      .attr("fill", (d) => colorMap[d.id] || UNASSIGNED_NODE_COLOR)
      .attr("stroke", (d) => {
        const c = d3.color(colorMap[d.id] || UNASSIGNED_NODE_COLOR)!
        return c.brighter(0.6).toString()
      })
      .attr("stroke-width", 2.5)
      .style("filter", (d) => glowMap[d.id] || `drop-shadow(0 0 8px ${UNASSIGNED_NODE_GLOW})`)

    node.append("text")
      .text((d) => d.id)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#ffffff")
      .attr("font-size", "12px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")

    // Spill indicator
    node.filter((d) => isSpillMap[d.id])
      .append("text")
      .text("⚠")
      .attr("text-anchor", "middle")
      .attr("dy", "-1.2em")
      .attr("font-size", "10px")
      .attr("pointer-events", "none")

    // Node hover
    node.on("mouseenter", function (event, d) {
      d3.select(this).select("circle")
        .transition().duration(200)
        .attr("r", 30)
        .attr("stroke-width", 3.5)

      link
        .attr("stroke", (l: any) =>
          (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id ? EDGE_HOVER_COLOR : EDGE_COLOR
        )
        .attr("stroke-opacity", (l: any) =>
          (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id ? 1 : 0.15
        )
        .attr("stroke-width", (l: any) =>
          (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id ? 3.5 : 1
        )
    })

    node.on("mouseleave", function () {
      d3.select(this).select("circle")
        .transition().duration(200)
        .attr("r", 22)
        .attr("stroke-width", 2.5)

      link
        .attr("stroke", EDGE_COLOR)
        .attr("stroke-opacity", 1)
        .attr("stroke-width", 2)
    })

    // Drag
    const drag = d3.drag<SVGGElement, any>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d3.select(event.sourceEvent.target.closest("g")).style("cursor", "grabbing")
      })
      .on("drag", (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d3.select(event.sourceEvent.target.closest("g")).style("cursor", "grab")
      })

    node.call(drag as any)

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`)
    })

    // Degree labels
    g.append("g")
      .selectAll("text")
      .data(nodeData)
      .join("text")
      .text((d) => `deg: ${graph.degrees[d.id] || 0}`)
      .attr("font-size", "9px")
      .attr("fill", "rgba(148, 163, 184, 0.6)")
      .attr("font-family", "monospace")
      .attr("text-anchor", "middle")
      .attr("dy", 36)

    return () => {
      simulation.stop()
    }
  }, [graph, dimensions, assignment])

  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3)
    }
  }

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7)
    }
  }

  const handleReset = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity)
    }
  }

  const handleExport = () => {
    if (!svgRef.current) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svgRef.current)
    const blob = new Blob([svgStr], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "interference-graph.svg"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={handleZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
        <div className="h-5 w-px bg-white/10 mx-2" />
        <Button size="sm" variant="ghost" onClick={handleExport}>
          <Download className="w-4 h-4" />
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>Nodes: {graph.variables.length}</span>
          <span>Edges: {graph.edges.length}</span>
          <span>K: {graph.K}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3.5 h-3.5 text-muted" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Drag nodes to rearrange. Hover to highlight neighbors.</p>
              <p>Colors show register assignment when available.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="relative rounded-xl border border-white/5 bg-[#0a0e1a] overflow-hidden"
        style={{ height: "450px" }}
      >
        <svg ref={svgRef} width="100%" height="100%" style={{ display: "block" }} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {hasAssignment && (
          <>
            <span className="text-muted">Register Colors:</span>
            {Array.from(new Set(Object.values(assignment))).sort((a, b) => a - b).map((reg) => (
              <div key={reg} className="flex items-center gap-1.5">
                <div
                  className="w-3.5 h-3.5 rounded-full shadow-lg"
                  style={{
                    backgroundColor: getRegisterColor(reg),
                    boxShadow: `0 0 6px ${getRegisterColor(reg)}80`,
                  }}
                />
                <span className="font-mono text-white/80 font-semibold">R{reg + 1}</span>
              </div>
            ))}
            {graph.variables.filter((v) => assignment[v] < 0).length > 0 && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-3.5 h-3.5 rounded-full shadow-lg"
                  style={{ backgroundColor: SPILL_NODE_COLOR, boxShadow: `0 0 6px ${SPILL_NODE_GLOW}` }}
                />
                <span className="font-mono text-red-400 font-semibold">SPILL</span>
              </div>
            )}
            <div className="h-4 w-px bg-white/10 mx-1" />
          </>
        )}
        <span className="text-muted">Unassigned:</span>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3.5 h-3.5 rounded-full shadow-lg"
            style={{ backgroundColor: UNASSIGNED_NODE_COLOR, boxShadow: `0 0 6px ${UNASSIGNED_NODE_GLOW}` }}
          />
          <span className="font-mono text-white/60">{graph.variables.length - Object.keys(assignment).length} nodes</span>
        </div>
      </div>
    </div>
  )
}
